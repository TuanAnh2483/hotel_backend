package com.hotel.hotel_backend.dto.response;

import java.math.BigDecimal;

public record HotelSearchItemResponse(
        Long hotelId,
        String name,
        String address,
        String province,
        String district,
        BigDecimal ratingAvg,
        Integer ratingCount,
        Long minPrice
) {
}
