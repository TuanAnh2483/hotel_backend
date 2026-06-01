package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record AdminReviewResponse(
        Long id,
        Long bookingId,
        Long hotelId,
        String hotelName,
        String userEmail,
        int rating,
        String comment,
        String partnerReply,
        OffsetDateTime createdAt
) {
}
