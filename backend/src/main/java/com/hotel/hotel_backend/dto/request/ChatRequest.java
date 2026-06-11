package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body cho /api/chat/customer và /api/chat/partner.
 * sessionId tuỳ chọn — nếu trống, backend tự sinh UUID và trả về cho client dùng lại.
 */
public record ChatRequest(
        @NotBlank(message = "message is required")
        @Size(max = 2000, message = "message quá dài")
        String message,

        String sessionId
) {
}
