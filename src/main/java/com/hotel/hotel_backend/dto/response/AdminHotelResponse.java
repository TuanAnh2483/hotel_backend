package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.entity.HotelType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AdminHotelResponse(
        Long id,
        String name,
        String ownerEmail,
        String address,
        String district,
        String province,
        String description,
        HotelType hotelType,
        HotelStatus status,
        BigDecimal ratingAvg,
        Integer ratingCount,
        OffsetDateTime createdAt
) {
}
