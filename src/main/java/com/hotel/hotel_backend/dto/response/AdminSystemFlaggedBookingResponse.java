package com.hotel.hotel_backend.dto.response;

import java.time.LocalDateTime;

public record AdminSystemFlaggedBookingResponse(
        Long id,
        Long bookingId,
        String severity,
        String message,
        LocalDateTime requestedAt
) {
}
