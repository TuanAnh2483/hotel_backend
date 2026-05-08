package com.hotel.hotel_backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record PriceSuggestionItem(
        String date,
        String dayName,
        String displayDate,
        double occupancy,
        String demand,
        @JsonProperty("isWeekend") boolean isWeekend,
        @JsonProperty("isHoliday") boolean isHoliday,
        String holidayTier,
        long currentPrice,
        Long suggestedPrice,
        Long priceLow,
        Long priceHigh,
        double deltaPct,
        String confidence,
        String reason,
        List<String> factors,
        int activeBookings,
        int totalRooms,
        boolean aiGenerated
) {}
