package com.hotel.hotel_backend.dto.response;

public record PartnerAnalyticsHotelSummaryResponse(
        Long hotelId,
        String hotelName,
        Long totalBookings,
        Long pendingPaymentBookings,
        Long confirmedBookings,
        Long completedBookings,
        Long refundedBookings,
        Long cancelledBookings,
        Double grossRevenue,
        Double refundedAmount,
        Double netRevenue
) {}
