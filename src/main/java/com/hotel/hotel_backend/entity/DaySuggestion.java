package com.hotel.hotel_backend.entity;

public record DaySuggestion(  //     // gợi ý theo ngày
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
        int totalRooms
) {}
