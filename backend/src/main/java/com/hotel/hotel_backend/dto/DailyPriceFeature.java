package com.hotel.hotel_backend.dto;

import java.time.LocalDate;

public record DailyPriceFeature(
        LocalDate date,
        String isoDate,
        String dayName,
        String displayDate,

        boolean weekend,
        boolean holiday,
        String holidayTier,

        long currentPrice,
        int activeBookings,
        int totalRooms,

        double occupancy,
        String demand,

        double demandFactor,
        double weekendFactor,
        double holidayFactor,

        String confidence
) {}
