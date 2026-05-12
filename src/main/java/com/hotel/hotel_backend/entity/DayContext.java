package com.hotel.hotel_backend.entity;

public record DayContext(   // bối cảnh theo ngày
        String date,
        String demand,
        boolean isWeekend,
        boolean isHoliday,
        String holidayTier,
        long currentPrice,
        Long baselineSuggestedPrice,
        double occupancy,
        double demandFactor,
        double weekendFactor,
        double holidayFactor,
        int bookingVelocity,
        int daysUntil,
        int avgLeadDays,
        double modelAggressiveness,
        double modelAcceptanceRate,
        int modelRound,
        Double modelHistWeekdayOcc,
        Double modelHistWeekendOcc
) {}
