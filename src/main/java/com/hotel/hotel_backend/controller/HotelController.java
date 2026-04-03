package com.hotel.hotel_backend.controller;


import com.hotel.hotel_backend.dto.request.HotelSearchRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.service.search.HotelSearchCriteria;
import com.hotel.hotel_backend.service.search.HotelSearchUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor

public class HotelController {
    private final HotelSearchUseCase hotelSearchUseCase;

    @GetMapping("/search")
    public ApiResponse<List<HotelSearchItemResponse>> search(@Valid @ModelAttribute HotelSearchRequest request){ ///@ModelAttribute giúp bind query param của GET
        HotelSearchCriteria criteria = new HotelSearchCriteria(
                request.getProvince(),
                request.getDistrict(),
                request.getCheckIn(),
                request.getCheckOut(),
                request.getAdults(),
                request.getRooms()
        );

        return ApiResponse.ok(hotelSearchUseCase.search(criteria));
    }
}
