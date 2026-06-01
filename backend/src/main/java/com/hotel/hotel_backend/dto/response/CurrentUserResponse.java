package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record CurrentUserResponse(
        Long id,
        String email,
        String userType,
        String status,
        boolean emailVerified,
        OffsetDateTime emailVerifiedAt
) {
}
