package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.HotelType;

import java.math.BigDecimal;
import java.util.List;

public record HotelSearchItemResponse(
        Long hotelId,
        String name,
        String address,
        String province,
        String district,
        String coverImageUrl,
        List<String> imageUrls,
        BigDecimal ratingAvg,
        Integer ratingCount,
        Long minPrice,
        Integer availableRoomTypes,
        Integer availableUnits,
        HotelType hotelType
) {
}
