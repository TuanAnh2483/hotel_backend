package com.hotel.hotel_backend.dto;

import lombok.Builder;

@Builder
public record OccupancyForecast(

        String date,

        double occupancy,

        String demand,

        boolean weekend,

        boolean holiday,

        String holidayTier,

        int activeBookings,

        int totalRooms,

        int velocity,

        int daysUntil,

        String confidence
) {}
