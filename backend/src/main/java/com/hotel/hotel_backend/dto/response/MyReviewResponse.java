package com.hotel.hotel_backend.dto.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MyReviewResponse(
        Long reviewId,
        Long bookingId,
        Long hotelId,
        String hotelName,
        int rating,
        String comment,
        String partnerReply,
        LocalDate checkIn,
        LocalDate checkOut,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime partnerRepliedAt
) {
}
