package com.hotel.hotel_backend.mapper;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import org.springframework.stereotype.Component;

@Component
public class HotelSearchMapper {

    public HotelSearchItemResponse toItem(Hotel hotel) {
        return new HotelSearchItemResponse(
                hotel.getId(),
                hotel.getName()
        );
    }
}
