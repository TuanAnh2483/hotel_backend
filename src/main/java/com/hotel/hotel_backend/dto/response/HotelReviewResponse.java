package com.hotel.hotel_backend.dto.response;

import java.time.OffsetDateTime;

public record HotelReviewResponse(
        Long reviewId,
        Long bookingId,
        Long hotelId,
        Integer rating,
        String comment,
        String reviewerName,
        String partnerReply,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime partnerRepliedAt
) {}
