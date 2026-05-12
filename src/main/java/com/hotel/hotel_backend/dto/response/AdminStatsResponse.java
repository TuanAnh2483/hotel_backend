package com.hotel.hotel_backend.dto.response;

public record AdminStatsResponse(
        long customerCount,
        long partnerCount,
        long hotelCount,
        long bookingCount,
        long pendingPaymentCount
) {
}
