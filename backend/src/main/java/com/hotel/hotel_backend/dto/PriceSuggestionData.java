package com.hotel.hotel_backend.dto;

import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.Room;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record PriceSuggestionData(
        Long ownerId,
        Room room,
        Long hotelId,
        long basePrice,
        int totalRooms,
        Map<LocalDate, Long> ratesByDate,
        List<Booking> allBookings,
        List<Booking> activeBookings
) {}
