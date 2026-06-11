package com.hotel.hotel_backend.service.chat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Client gọi Gemini cho luồng chat có function-calling.
 *
 * <p>Tách riêng khỏi {@code price.ai.GeminiClient} (chỉ sinh text 1 lượt) vì ở đây cần
 * gửi nguyên history dạng {@code contents}, kèm danh sách {@code tools} và đọc lại
 * {@code functionCall} mà model trả về. Hỗ trợ cả {@code generateContent} (non-stream)
 * và {@code streamGenerateContent?alt=sse} (stream từng chunk text), dùng cùng key
 * {@code app.ai.gemini-api-key}.
 */
@Service
@Slf4j
public class ChatGeminiClient {

    private static final int MAX_ATTEMPTS = 3;
    private static final long[] BACKOFF_MS = {300L, 800L};

    @Value("${app.ai.gemini-api-key:}")
    private String apiKey;

    @Value("${app.ai.model:gemini-2.5-flash-lite}")
    private String model;

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatGeminiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .requestFactory(factory)
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Gửi 1 lượt generateContent (non-stream). {@code contents} là toàn bộ history (mỗi phần tử
     * là 1 Content map {role, parts}), {@code tools} là function declarations, {@code systemInstruction}
     * là system prompt theo role. Có retry với lỗi tạm thời (429/5xx/timeout).
     */
    public GeminiTurn generate(List<Map<String, Object>> contents,
                               List<Map<String, Object>> tools,
                               String systemInstruction) {
        requireConfigured();
        Map<String, Object> body = buildBody(contents, tools, systemInstruction);
        String url = "/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        String raw = withRetry(() -> restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class));
        return parse(raw);
    }

    /**
     * Gửi 1 lượt streamGenerateContent (SSE). Mỗi mảnh text được đẩy qua {@code onTextDelta}
     * ngay khi nhận; functionCall thì gom lại không phát delta. Trả về {@link GeminiTurn}:
     * functionCall (nếu model gọi tool) hoặc text (toàn bộ text đã gom).
     *
     * <p>Retry chỉ áp dụng khi chưa phát delta nào (lỗi lúc thiết lập/đầu stream) để tránh
     * lặp text giữa chừng.
     */
    public GeminiTurn generateStream(List<Map<String, Object>> contents,
                                     List<Map<String, Object>> tools,
                                     String systemInstruction,
                                     Consumer<String> onTextDelta) {
        requireConfigured();
        Map<String, Object> body = buildBody(contents, tools, systemInstruction);
        String url = "/v1beta/models/" + model + ":streamGenerateContent?alt=sse&key=" + apiKey;

        RuntimeException last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            EmitGuard guard = new EmitGuard(onTextDelta);
            try {
                return restClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .exchange((request, response) -> readSseStream(response.getBody(), guard));
            } catch (HttpClientErrorException.TooManyRequests | HttpServerErrorException | ResourceAccessException e) {
                if (guard.emitted || attempt == MAX_ATTEMPTS - 1) {
                    throw e;
                }
                last = e;
                sleep(BACKOFF_MS[attempt]);
                log.warn("[Chat] stream lỗi tạm thời ({}), thử lại lần {}", e.getClass().getSimpleName(), attempt + 2);
            }
        }
        throw last != null ? last : new IllegalStateException("Stream thất bại");
    }

    private GeminiTurn readSseStream(InputStream in, EmitGuard guard) {
        StringBuilder text = new StringBuilder();
        String fnName = null;
        Map<String, Object> fnArgs = null;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String json = line.substring(5).trim();
                if (json.isEmpty() || "[DONE]".equals(json)) {
                    continue;
                }
                JsonNode parts = objectMapper.readTree(json)
                        .path("candidates").path(0).path("content").path("parts");
                for (JsonNode part : parts) {
                    JsonNode fc = part.get("functionCall");
                    if (fc != null && !fc.isNull()) {
                        fnName = fc.path("name").asText();
                        JsonNode argsNode = fc.get("args");
                        fnArgs = (argsNode == null || !argsNode.isObject())
                                ? Map.of()
                                : objectMapper.convertValue(argsNode, new TypeReference<Map<String, Object>>() {});
                        continue;
                    }
                    JsonNode t = part.get("text");
                    if (t != null && !t.isNull()) {
                        String piece = t.asText();
                        text.append(piece);
                        guard.emit(piece);
                    }
                }
            }
        } catch (Exception e) {
            // Lỗi đọc giữa chừng: nếu đã có text thì trả phần đã nhận, ngược lại ném để retry/fallback.
            if (text.length() == 0 && fnName == null) {
                throw new ResourceAccessException("Lỗi đọc stream Gemini: " + e.getMessage());
            }
            log.warn("[Chat] stream gián đoạn, dùng phần đã nhận: {}", e.getMessage());
        }
        return fnName != null ? GeminiTurn.functionCall(fnName, fnArgs) : GeminiTurn.text(text.toString());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("Gemini API key not configured");
        }
    }

    private Map<String, Object> buildBody(List<Map<String, Object>> contents,
                                          List<Map<String, Object>> tools,
                                          String systemInstruction) {
        Map<String, Object> body = new HashMap<>();
        body.put("contents", contents);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", List.of(Map.of("functionDeclarations", tools)));
        }
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        }
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.3);
        generationConfig.put("maxOutputTokens", 1024);
        body.put("generationConfig", generationConfig);
        return body;
    }

    /** Thử lại tối đa {@link #MAX_ATTEMPTS} lần với lỗi tạm thời (429/5xx/timeout). */
    private <T> T withRetry(Supplier<T> call) {
        RuntimeException last = null;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                return call.get();
            } catch (HttpClientErrorException.TooManyRequests | HttpServerErrorException | ResourceAccessException e) {
                last = e;
                if (attempt == MAX_ATTEMPTS - 1) {
                    break;
                }
                sleep(BACKOFF_MS[attempt]);
                log.warn("[Chat] Gemini lỗi tạm thời ({}), thử lại lần {}", e.getClass().getSimpleName(), attempt + 2);
            }
        }
        throw last != null ? last : new IllegalStateException("Gemini call thất bại");
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private GeminiTurn parse(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");

            // Ưu tiên functionCall nếu model quyết định gọi tool.
            for (JsonNode part : parts) {
                JsonNode fc = part.get("functionCall");
                if (fc != null && !fc.isNull()) {
                    String name = fc.path("name").asText();
                    JsonNode argsNode = fc.get("args");
                    Map<String, Object> args = (argsNode == null || !argsNode.isObject())
                            ? Map.of()
                            : objectMapper.convertValue(argsNode, new TypeReference<Map<String, Object>>() {
                            });
                    return GeminiTurn.functionCall(name, args);
                }
            }

            StringBuilder text = new StringBuilder();
            for (JsonNode part : parts) {
                JsonNode t = part.get("text");
                if (t != null && !t.isNull()) {
                    text.append(t.asText());
                }
            }
            return GeminiTurn.text(text.toString());
        } catch (Exception e) {
            log.warn("[Chat] Không parse được response Gemini: {}", e.getMessage());
            throw new IllegalStateException("Failed to parse Gemini response", e);
        }
    }

    /** Theo dõi đã phát delta nào chưa (để quyết định có retry stream được không). */
    private static final class EmitGuard {
        private final Consumer<String> sink;
        private boolean emitted;

        EmitGuard(Consumer<String> sink) {
            this.sink = sink;
        }

        void emit(String piece) {
            emitted = true;
            if (sink != null) {
                sink.accept(piece);
            }
        }
    }

    /** Kết quả 1 lượt: hoặc text cuối cùng, hoặc 1 functionCall cần thực thi. */
    public record GeminiTurn(String text, String functionName, Map<String, Object> functionArgs) {

        public boolean isFunctionCall() {
            return functionName != null && !functionName.isBlank();
        }

        static GeminiTurn text(String text) {
            return new GeminiTurn(text, null, null);
        }

        static GeminiTurn functionCall(String name, Map<String, Object> args) {
            return new GeminiTurn(null, name, args);
        }
    }
}
