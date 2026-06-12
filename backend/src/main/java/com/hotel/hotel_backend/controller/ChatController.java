package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.ChatRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.ChatResponse;
import com.hotel.hotel_backend.service.chat.ChatRateLimiter;
import com.hotel.hotel_backend.service.chat.ChatService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.function.Consumer;

@Tag(name = "Chat", description = "Chatbot HotelHub (Gemini) cho customer và partner")
@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@RequiredArgsConstructor
public class ChatController {

    /** SseEmitter timeout: dài hơn vòng tool-calling + đọc stream Gemini. */
    private static final long SSE_TIMEOUT_MS = 120_000L;

    /** Câu nhắc khi bị rate-limit (không gọi Gemini). */
    private static final String BUSY_MSG = "Bạn nhắn hơi nhanh, đợi chút rồi thử lại nhé.";

    private final ChatService chatService;
    private final ChatRateLimiter rateLimiter;

    /** Resolve theo tên field = tên bean "chatStreamExecutor" (có 2 Executor bean). */
    private final Executor chatStreamExecutor;

    /** Public: trợ lý đặt phòng cho khách (không cần đăng nhập). */
    @PostMapping("/customer")
    public ApiResponse<ChatResponse> customer(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        String sessionId = resolveSessionId(request.sessionId());
        if (!rateLimiter.allow(clientKey(http, "customer"))) {
            return ApiResponse.ok(new ChatResponse(BUSY_MSG, sessionId));
        }
        String reply = chatService.chatCustomer(request.message(), sessionId, request.context(), request.confirm());
        return ApiResponse.ok(new ChatResponse(reply, sessionId));
    }

    /** Protected: trợ lý quản lý cho đối tác — ownerId/propertyName tự lấy từ JWT. */
    @PostMapping("/partner")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<ChatResponse> partner(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        String sessionId = resolveSessionId(request.sessionId());
        if (!rateLimiter.allow(clientKey(http, "partner"))) {
            return ApiResponse.ok(new ChatResponse(BUSY_MSG, sessionId));
        }
        String reply = chatService.chatPartner(request.message(), sessionId, request.context(), request.confirm());
        return ApiResponse.ok(new ChatResponse(reply, sessionId));
    }

    /** Public streaming (SSE): trả lời gõ dần cho khách. */
    @PostMapping("/customer/stream")
    public SseEmitter customerStream(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        String sessionId = resolveSessionId(request.sessionId());
        if (!rateLimiter.allow(clientKey(http, "customer"))) {
            return busyStream(sessionId);
        }
        return stream(emitter ->
                chatService.chatCustomerStream(request.message(), sessionId, request.context(), request.confirm(), emitter));
    }

    /** Protected streaming (SSE) cho đối tác. */
    @PostMapping("/partner/stream")
    @PreAuthorize("hasRole('PARTNER')")
    public SseEmitter partnerStream(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        String sessionId = resolveSessionId(request.sessionId());
        if (!rateLimiter.allow(clientKey(http, "partner"))) {
            return busyStream(sessionId);
        }
        return stream(emitter ->
                chatService.chatPartnerStream(request.message(), sessionId, request.context(), request.confirm(), emitter));
    }

    /**
     * Khởi tạo SseEmitter và chạy luồng chat trên {@code chatStreamExecutor}. Propagate
     * SecurityContext sang worker thread để partner tool (lấy ownerId từ JWT) hoạt động đúng.
     */
    private SseEmitter stream(Consumer<SseEmitter> body) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        SecurityContext context = SecurityContextHolder.getContext();

        chatStreamExecutor.execute(() -> {
            SecurityContext previous = SecurityContextHolder.getContext();
            SecurityContextHolder.setContext(context);
            try {
                body.accept(emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            } finally {
                SecurityContextHolder.setContext(previous);
            }
        });
        return emitter;
    }

    /** Trả nhanh 1 emitter báo bận (delta + done) khi bị rate-limit, không chạm Gemini. */
    private SseEmitter busyStream(String sessionId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        try {
            emitter.send(SseEmitter.event().name("delta").data(Map.of("text", BUSY_MSG), MediaType.APPLICATION_JSON));
            emitter.send(SseEmitter.event().name("done").data(Map.of("sessionId", sessionId), MediaType.APPLICATION_JSON));
            emitter.complete();
        } catch (Exception ignored) {
            // Client có thể đã ngắt — bỏ qua.
        }
        return emitter;
    }

    /** Key rate-limit: IP client (ưu tiên X-Forwarded-For khi sau proxy như Render) + role. */
    private String clientKey(HttpServletRequest http, String role) {
        String ip = http.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            int comma = ip.indexOf(',');
            ip = (comma > 0 ? ip.substring(0, comma) : ip).trim();
        } else {
            ip = http.getRemoteAddr();
        }
        return (ip == null ? "unknown" : ip) + ":" + role;
    }

    private String resolveSessionId(String sessionId) {
        return (sessionId != null && !sessionId.isBlank()) ? sessionId : UUID.randomUUID().toString();
    }
}
