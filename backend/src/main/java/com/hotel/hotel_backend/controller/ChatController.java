package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.ChatRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.ChatResponse;
import com.hotel.hotel_backend.service.chat.ChatService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;
import java.util.concurrent.Executor;

@Tag(name = "Chat", description = "Chatbot HotelHub (Gemini) cho customer và partner")
@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@RequiredArgsConstructor
public class ChatController {

    /** SseEmitter timeout: dài hơn vòng tool-calling + đọc stream Gemini. */
    private static final long SSE_TIMEOUT_MS = 120_000L;

    private final ChatService chatService;

    /** Resolve theo tên field = tên bean "chatStreamExecutor" (có 2 Executor bean). */
    private final Executor chatStreamExecutor;

    /** Public: trợ lý đặt phòng cho khách (không cần đăng nhập). */
    @PostMapping("/customer")
    public ApiResponse<ChatResponse> customer(@Valid @RequestBody ChatRequest request) {
        String sessionId = resolveSessionId(request.sessionId());
        String reply = chatService.chatCustomer(request.message(), sessionId);
        return ApiResponse.ok(new ChatResponse(reply, sessionId));
    }

    /** Protected: trợ lý quản lý cho đối tác — ownerId/propertyName tự lấy từ JWT. */
    @PostMapping("/partner")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<ChatResponse> partner(@Valid @RequestBody ChatRequest request) {
        String sessionId = resolveSessionId(request.sessionId());
        String reply = chatService.chatPartner(request.message(), sessionId);
        return ApiResponse.ok(new ChatResponse(reply, sessionId));
    }

    /** Public streaming (SSE): trả lời gõ dần cho khách. */
    @PostMapping("/customer/stream")
    public SseEmitter customerStream(@Valid @RequestBody ChatRequest request) {
        return stream(request, chatService::chatCustomerStream);
    }

    /** Protected streaming (SSE) cho đối tác. */
    @PostMapping("/partner/stream")
    @PreAuthorize("hasRole('PARTNER')")
    public SseEmitter partnerStream(@Valid @RequestBody ChatRequest request) {
        return stream(request, chatService::chatPartnerStream);
    }

    /**
     * Khởi tạo SseEmitter và chạy luồng chat trên {@code chatStreamExecutor}. Propagate
     * SecurityContext sang worker thread để partner tool (lấy ownerId từ JWT) hoạt động đúng.
     */
    private SseEmitter stream(ChatRequest request, StreamHandler handler) {
        String sessionId = resolveSessionId(request.sessionId());
        String message = request.message();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        SecurityContext context = SecurityContextHolder.getContext();

        chatStreamExecutor.execute(() -> {
            SecurityContext previous = SecurityContextHolder.getContext();
            SecurityContextHolder.setContext(context);
            try {
                handler.handle(message, sessionId, emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            } finally {
                SecurityContextHolder.setContext(previous);
            }
        });
        return emitter;
    }

    private String resolveSessionId(String sessionId) {
        return (sessionId != null && !sessionId.isBlank()) ? sessionId : UUID.randomUUID().toString();
    }

    @FunctionalInterface
    private interface StreamHandler {
        void handle(String message, String sessionId, SseEmitter emitter);
    }
}
