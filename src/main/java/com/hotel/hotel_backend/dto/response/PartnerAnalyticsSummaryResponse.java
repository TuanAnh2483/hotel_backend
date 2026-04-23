package com.hotel.hotel_backend.dto.response;

import java.time.LocalDate;
import java.util.List;

public record PartnerAnalyticsSummaryResponse(
        Long hotelIdFilter,
        LocalDate checkInFrom,
        LocalDate checkInTo,
        Long totalBookings,
        Long pendingPaymentBookings,
        Long confirmedBookings,
        Long completedBookings,
        Long refundedBookings,
        Long cancelledBookings,
        Double grossRevenue,
        Double refundedAmount,
        Double netRevenue,
        List<PartnerAnalyticsHotelSummaryResponse> hotels
) {}
