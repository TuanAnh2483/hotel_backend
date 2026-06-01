package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record VerifyEmailResponse(
        String message,
        OffsetDateTime verifiedAt
) {}
