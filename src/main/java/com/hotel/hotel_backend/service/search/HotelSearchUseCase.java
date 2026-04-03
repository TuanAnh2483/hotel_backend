package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;

import java.util.List;

public interface HotelSearchUseCase {
    List<HotelSearchItemResponse> search(HotelSearchCriteria criteria);
}
