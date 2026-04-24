package com.hotel.hotel_backend.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record HotelDetailResponse (
        Long hotelId,
        String name,
        String address,
        String province,
        String district,
        String description,
        String coverImageUrl,
        List<String> imageUrls,
        BigDecimal ratingAvg,
        Integer ratingCount
)
{


}
