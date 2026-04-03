package com.hotel.hotel_backend.dto.response;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserView user
) {
    public record UserView(Long id, String email, String userType, String status) {}
}
