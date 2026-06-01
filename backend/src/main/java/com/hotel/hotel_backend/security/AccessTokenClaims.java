package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.entity.UserType;

public record AccessTokenClaims(
        Long userId,
        String email,
        UserType role,
        long tokenVersion
) {
}
