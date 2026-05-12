package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record RegisterResponse(
        String message,
        String deliveryMode,
        String verificationToken,
        OffsetDateTime expiresAt
) {}
