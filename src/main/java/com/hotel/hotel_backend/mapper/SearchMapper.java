package com.hotel.hotel_backend.mapper;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import java.util.ArrayList;
import java.util.List;

public class SearchMapper {
/// map Hotel -> HotelSearchResponse .......
    public List<HotelSearchItemResponse> toHotelSearchResponse() {
        List<Hotel>  hotels = new ArrayList<>();

        return hotels.stream()
                .map(hotel -> new HotelSearchItemResponse(
                        hotel.getId(),
                        hotel.getName()
                ))
                .toList();    }


}
