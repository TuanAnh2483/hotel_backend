package com.hotel.hotel_backend.mapper;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import org.springframework.stereotype.Component;

@Component
public class HotelSearchMapper {

    public HotelSearchItemResponse toItem(Hotel hotel, Long minPrice) {
        return new HotelSearchItemResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getAddress(),
                hotel.getProvince(),
                hotel.getDistrict(),
                hotel.getRatingAvg(),
                hotel.getRatingCount(),
                minPrice
        );
    }
}
