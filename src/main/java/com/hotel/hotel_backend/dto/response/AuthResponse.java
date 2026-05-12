package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserView user
) {
    public record UserView(
            Long id,
            String email,
            String userType,
            String status,
            boolean emailVerified,
            OffsetDateTime emailVerifiedAt
    ) {}
}
