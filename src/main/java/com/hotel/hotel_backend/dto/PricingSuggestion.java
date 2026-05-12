package com.hotel.hotel_backend.dto;

import lombok.Builder;

@Builder
public record PricingSuggestion(

        String date,
        String dayName,
        String displayDate,

        double occupancy,
        String demand,

        boolean isWeekend,
        boolean isHoliday,
        String holidayTier,

        long currentPrice,

        Long suggestedPrice,
        Long priceLow,
        Long priceHigh,

        double deltaPct,

        String confidence,

        int activeBookings,
        int totalRooms,

        int velocity,
        int daysUntil

) {}
