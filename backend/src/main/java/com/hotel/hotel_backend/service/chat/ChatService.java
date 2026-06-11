package com.hotel.hotel_backend.service.chat;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.UserProfileRepository;
import com.hotel.hotel_backend.service.SecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * Orchestrator của chatbot: giữ vòng lặp function-calling giữa Gemini và các tool service.
 *
 * <p>Mỗi request: lấy history theo sessionId → append message user → lặp tối đa
 * {@link #MAX_TOOL_ITERATIONS} lượt gọi Gemini (thực thi tool nếu model yêu cầu) → trả text
 * cuối cùng và lưu lại history (trim 20). Khi Gemini chưa cấu hình key hoặc lỗi/timeout,
 * trả câu fallback thay vì 500.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ChatService {

    private static final int MAX_TOOL_ITERATIONS = 5;
    private static final String FALLBACK_MSG =
            "Xin lỗi, trợ lý đang tạm thời gián đoạn. Bạn vui lòng thử lại sau ít phút nhé.";

    private final ChatGeminiClient geminiClient;
    private final ChatSessionService sessionService;
    private final CustomerToolService customerToolService;
    private final PartnerToolService partnerToolService;
    private final SecurityService securityService;
    private final HotelRepository hotelRepository;
    private final UserProfileRepository userProfileRepository;

    public String chatCustomer(String message, String sessionId) {
        return chat(ChatRole.CUSTOMER, message, sessionId, ChatTools.CUSTOMER_TOOLS, customerSystemPrompt());
    }

    public String chatPartner(String message, String sessionId) {
        return chat(ChatRole.PARTNER, message, sessionId, ChatTools.PARTNER_TOOLS, partnerSystemPrompt());
    }

    public void chatCustomerStream(String message, String sessionId, SseEmitter emitter) {
        chatStream(ChatRole.CUSTOMER, message, sessionId, ChatTools.CUSTOMER_TOOLS, customerSystemPrompt(), emitter);
    }

    public void chatPartnerStream(String message, String sessionId, SseEmitter emitter) {
        chatStream(ChatRole.PARTNER, message, sessionId, ChatTools.PARTNER_TOOLS, partnerSystemPrompt(), emitter);
    }

    private String chat(ChatRole role, String message, String sessionId,
                        List<Map<String, Object>> tools, String systemPrompt) {
        if (!geminiClient.isConfigured()) {
            return FALLBACK_MSG;
        }
        List<Map<String, Object>> history = new ArrayList<>(sessionService.getHistory(sessionId));
        history.add(userContent(message));
        try {
            String reply = runLoop(role, history, tools, systemPrompt);
            sessionService.save(sessionId, history);
            return reply;
        } catch (Exception e) {
            log.warn("[Chat] role={} lỗi xử lý: {}", role, e.getMessage());
            return FALLBACK_MSG;
        }
    }

    /**
     * Biến thể streaming: chạy cùng vòng lặp tool-calling nhưng stream lượt sinh text cuối
     * xuống client qua {@link SseEmitter}. Luôn complete emitter (kể cả khi lỗi/chưa configured)
     * để client không bị treo. Phải được gọi trên thread đã có SecurityContext (partner cần JWT).
     */
    private void chatStream(ChatRole role, String message, String sessionId,
                            List<Map<String, Object>> tools, String systemPrompt, SseEmitter emitter) {
        if (!geminiClient.isConfigured()) {
            sendDelta(emitter, FALLBACK_MSG);
            finish(emitter, sessionId);
            return;
        }
        List<Map<String, Object>> history = new ArrayList<>(sessionService.getHistory(sessionId));
        history.add(userContent(message));
        boolean[] emitted = {false};
        Consumer<String> onDelta = piece -> {
            emitted[0] = true;
            sendDelta(emitter, piece);
        };
        try {
            for (int i = 0; i < MAX_TOOL_ITERATIONS; i++) {
                ChatGeminiClient.GeminiTurn turn = geminiClient.generateStream(history, tools, systemPrompt, onDelta);
                if (turn.isFunctionCall()) {
                    history.add(modelFunctionCall(turn.functionName(), turn.functionArgs()));
                    safeSend(emitter, "tool", Map.of("name", turn.functionName()));
                    Map<String, Object> result = dispatch(role, turn.functionName(), turn.functionArgs());
                    history.add(functionResponse(turn.functionName(), result));
                    continue;
                }
                String text = turn.text();
                if (text == null || text.isBlank()) {
                    text = "Mình chưa rõ ý bạn lắm, bạn nói rõ hơn giúp mình nhé.";
                    if (!emitted[0]) {
                        sendDelta(emitter, text);
                    }
                }
                history.add(modelTextContent(text));
                sessionService.save(sessionId, history);
                finish(emitter, sessionId);
                return;
            }
            String giveUp = "Xin lỗi, mình chưa xử lý xong yêu cầu này. Bạn thử diễn đạt lại nhé.";
            if (!emitted[0]) {
                sendDelta(emitter, giveUp);
            }
            history.add(modelTextContent(giveUp));
            sessionService.save(sessionId, history);
            finish(emitter, sessionId);
        } catch (Exception e) {
            log.warn("[Chat] stream role={} lỗi xử lý: {}", role, e.getMessage());
            if (!emitted[0]) {
                sendDelta(emitter, FALLBACK_MSG);
            }
            finish(emitter, sessionId);
        }
    }

    private void sendDelta(SseEmitter emitter, String text) {
        safeSend(emitter, "delta", Map.of("text", text));
    }

    private void finish(SseEmitter emitter, String sessionId) {
        safeSend(emitter, "done", Map.of("sessionId", sessionId));
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // emitter có thể đã đóng (client ngắt) — bỏ qua.
        }
    }

    private void safeSend(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data, MediaType.APPLICATION_JSON));
        } catch (Exception e) {
            // Client ngắt kết nối hoặc emitter đã đóng — không cần làm gì thêm.
            log.debug("[Chat] không gửi được SSE event {}: {}", event, e.getMessage());
        }
    }

    private String runLoop(ChatRole role, List<Map<String, Object>> history,
                           List<Map<String, Object>> tools, String systemPrompt) {
        for (int i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            ChatGeminiClient.GeminiTurn turn = geminiClient.generate(history, tools, systemPrompt);
            if (turn.isFunctionCall()) {
                history.add(modelFunctionCall(turn.functionName(), turn.functionArgs()));
                Map<String, Object> result = dispatch(role, turn.functionName(), turn.functionArgs());
                history.add(functionResponse(turn.functionName(), result));
                continue;
            }
            String text = turn.text();
            if (text == null || text.isBlank()) {
                text = "Mình chưa rõ ý bạn lắm, bạn nói rõ hơn giúp mình nhé.";
            }
            history.add(modelTextContent(text));
            return text;
        }
        String giveUp = "Xin lỗi, mình chưa xử lý xong yêu cầu này. Bạn thử diễn đạt lại nhé.";
        history.add(modelTextContent(giveUp));
        return giveUp;
    }

    private Map<String, Object> dispatch(ChatRole role, String name, Map<String, Object> args) {
        try {
            return role == ChatRole.PARTNER
                    ? partnerToolService.execute(name, args)
                    : customerToolService.execute(name, args);
        } catch (ApiException e) {
            return Map.of("error", e.getMessage() != null ? e.getMessage() : e.getCode().name());
        } catch (Exception e) {
            log.warn("[Chat] tool {} lỗi: {}", name, e.getMessage());
            return Map.of("error", "Không thực hiện được thao tác này.");
        }
    }

    // ── Gemini Content builders ──────────────────────────────────────────────

    private Map<String, Object> userContent(String text) {
        return Map.of("role", "user", "parts", List.of(Map.of("text", text == null ? "" : text)));
    }

    private Map<String, Object> modelTextContent(String text) {
        return Map.of("role", "model", "parts", List.of(Map.of("text", text == null ? "" : text)));
    }

    private Map<String, Object> modelFunctionCall(String name, Map<String, Object> args) {
        return Map.of("role", "model", "parts",
                List.of(Map.of("functionCall", Map.of("name", name, "args", args == null ? Map.of() : args))));
    }

    private Map<String, Object> functionResponse(String name, Map<String, Object> result) {
        return Map.of("role", "user", "parts",
                List.of(Map.of("functionResponse", Map.of("name", name, "response", result))));
    }

    // ── System prompts ───────────────────────────────────────────────────────

    private String customerSystemPrompt() {
        return """
                Bạn là trợ lý đặt phòng của HotelHub — nền tảng đặt phòng khách sạn trực tuyến.
                Nhiệm vụ: giúp khách tìm phòng, tra cứu booking, trả lời thắc mắc.
                Ngôn ngữ: tiếng Việt, thân thiện tự nhiên.

                Quy tắc:
                - Không bịa thông tin — chỉ trả lời dựa trên kết quả từ tool.
                - Tìm phòng được hỗ trợ theo địa điểm: khách nêu tỉnh/thành phố hoặc quận/huyện
                  thì truyền vào tham số location của search_rooms (không bắt buộc khách phải nêu tên khách sạn).
                - Nếu thiếu thông tin để gọi tool, hỏi lại ngắn gọn — mỗi lần chỉ hỏi 1 thông tin còn thiếu.
                - Khi đã đủ thông tin thì gọi tool ngay, không hỏi thêm.
                - Nếu tool trả về không có kết quả, thông báo lịch sự và gợi ý thay đổi tiêu chí.
                - Không trả lời các chủ đề ngoài phạm vi đặt phòng khách sạn.
                - Hôm nay là %s.
                """.formatted(LocalDate.now());
    }

    private String partnerSystemPrompt() {
        long ownerId = securityService.getCurrentPrincipal().userId();
        String partnerName = userProfileRepository.findByUserId(ownerId)
                .map(p -> firstNonBlank(p.getBrandName(), p.getFullName()))
                .filter(s -> s != null && !s.isBlank())
                .orElse("đối tác");
        List<Hotel> hotels = hotelRepository.findByOwnerId(ownerId);
        String propertyName = hotels.isEmpty()
                ? "(chưa có khách sạn)"
                : hotels.stream().map(Hotel::getName).collect(Collectors.joining(", "));

        return """
                Bạn là trợ lý quản lý của HotelHub dành cho đối tác.
                Đối tác hiện tại: %s — Khách sạn: %s
                Nhiệm vụ: hỗ trợ xem thống kê, quản lý phòng, theo dõi booking.
                Ngôn ngữ: tiếng Việt, ngắn gọn chuyên nghiệp.

                Quy tắc:
                - Chỉ được truy cập dữ liệu thuộc khách sạn của đối tác này.
                - Không bịa số liệu — chỉ trả lời dựa trên kết quả từ tool.
                - Nếu thiếu thông tin để gọi tool, hỏi lại ngắn gọn — mỗi lần chỉ hỏi 1 thông tin còn thiếu.
                - Khi đã đủ thông tin thì gọi tool ngay, không hỏi thêm.
                - Với thao tác block/unblock phòng: PHẢI xác nhận lại với người dùng trước khi thực thi —
                  chỉ gọi tool block_room sau khi người dùng đã đồng ý rõ ràng.
                - Hôm nay là %s.
                """.formatted(partnerName, propertyName, LocalDate.now());
    }

    private String firstNonBlank(String a, String b) {
        return (a != null && !a.isBlank()) ? a : b;
    }
}
