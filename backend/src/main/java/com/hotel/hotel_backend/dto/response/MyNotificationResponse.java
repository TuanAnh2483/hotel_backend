package com.hotel.hotel_backend.dto.response;

public record MyNotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String occurredAt,
        boolean read,
        String readAt,
        String actionUrl
) {
    public MyNotificationResponse(
            String type,
            String title,
            String message,
            String occurredAt
    ) {
        this(null, type, title, message, occurredAt, true, null, null);
    }
}
