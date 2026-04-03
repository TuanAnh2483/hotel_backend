package com.hotel.hotel_backend.dto.response;

public record CurrentUserResponse(
        Long id,
        String email,
        String userType,
        String status
) {
}
