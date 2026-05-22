package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.BookingMode;
import com.hotel.hotel_backend.entity.HotelAmenity;
import com.hotel.hotel_backend.entity.HotelType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public record HotelDetailResponse (
        Long hotelId,
        String name,
        String address,
        String province,
        String district,
        String description,
        HotelType hotelType,
        BookingMode bookingMode,
        Set<HotelAmenity> amenities,
        Set<String> customAmenities,
        String coverImageUrl,
        List<String> imageUrls,
        BigDecimal ratingAvg,
        Integer ratingCount
)
{


}
