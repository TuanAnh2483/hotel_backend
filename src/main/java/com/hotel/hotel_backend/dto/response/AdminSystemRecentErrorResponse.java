package com.hotel.hotel_backend.dto.response;

import java.time.LocalDateTime;

public record AdminSystemRecentErrorResponse(
        Long id,
        String type,
        String message,
        LocalDateTime createdAt
) {
}
