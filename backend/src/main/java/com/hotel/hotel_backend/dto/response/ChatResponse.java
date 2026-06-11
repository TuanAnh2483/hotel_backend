package com.hotel.hotel_backend.dto.response;

/** Phản hồi chatbot: câu trả lời cuối cùng + sessionId (để client giữ phiên hội thoại). */
public record ChatResponse(
        String reply,
        String sessionId
) {
}
