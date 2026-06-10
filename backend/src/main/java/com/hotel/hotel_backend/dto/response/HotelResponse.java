package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.BookingMode;
import com.hotel.hotel_backend.entity.CancellationPolicy;
import com.hotel.hotel_backend.entity.HotelAmenity;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.entity.HotelType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public record HotelResponse(
        Long id,
        String name,
        String address,
        String district,
        String province,
        Double latitude,
        Double longitude,
        String description,
        HotelType hotelType,
        BookingMode bookingMode,
        Set<HotelAmenity> amenities,
        Set<String> customAmenities,
        BigDecimal ratingAvg,
        Integer ratingCount,
        String coverImageUrl,
        List<String> imageUrls,
        HotelStatus status,
        CancellationPolicy cancellationPolicy
) {}
