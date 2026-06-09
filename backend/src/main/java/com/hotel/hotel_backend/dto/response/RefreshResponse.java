package com.hotel.hotel_backend.dto.response;

public record RefreshResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String refreshToken,
        long refreshExpiresIn
) {}
