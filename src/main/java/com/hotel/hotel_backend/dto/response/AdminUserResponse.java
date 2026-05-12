package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;

import java.time.OffsetDateTime;

public record AdminUserResponse(
        Long id,
        String email,
        UserType userType,
        UserStatus status,
        OffsetDateTime createdAt
) {
}
