package com.hotel.hotel_backend.mapper;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelType;

import java.util.ArrayList;
import java.util.List;

public class SearchMapper {
/// map Hotel -> HotelSearchResponse .......
    public List<HotelSearchItemResponse> toHotelSearchResponse() {
        List<Hotel>  hotels = new ArrayList<>();

        return hotels.stream()
                .map(hotel -> new HotelSearchItemResponse(
                        hotel.getId(),
                        hotel.getName(),
                        hotel.getAddress(),
                        hotel.getProvince(),
                        hotel.getDistrict(),
                        hotel.getCoverImageUrl() != null ? hotel.getCoverImageUrl()
                                : hotel.getImageUrls().isEmpty() ? null : hotel.getImageUrls().get(0),
                        hotel.getImageUrls(),
                        hotel.getRatingAvg(),
                        hotel.getRatingCount(),
                        null,
                        0,
                        0,
                        hotel.getHotelType()
                ))
                .toList();
    }

}
