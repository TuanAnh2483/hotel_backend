package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record ForgotPasswordResponse(
        String message,
        String deliveryMode,
        String resetToken,
        OffsetDateTime expiresAt
) {}
