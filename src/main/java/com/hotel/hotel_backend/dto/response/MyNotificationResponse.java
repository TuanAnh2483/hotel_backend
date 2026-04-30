package com.hotel.hotel_backend.dto.response;

public record MyNotificationResponse(
        String type,
        String title,
        String message,
        String occurredAt
) {
}
