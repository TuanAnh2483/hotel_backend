package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.BookingMode;
import com.hotel.hotel_backend.entity.HotelAmenity;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.entity.HotelType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Set;

public record AdminHotelResponse(
        Long id,
        String name,
        String ownerEmail,
        String address,
        String district,
        String province,
        Double latitude,
        Double longitude,
        String description,
        HotelType hotelType,
        BookingMode bookingMode,
        HotelStatus status,
        BigDecimal ratingAvg,
        Integer ratingCount,
        OffsetDateTime createdAt,
        Set<HotelAmenity> amenities,
        Set<String> customAmenities
) {
}
