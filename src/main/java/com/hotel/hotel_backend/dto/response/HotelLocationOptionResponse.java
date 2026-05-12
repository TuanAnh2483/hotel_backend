package com.hotel.hotel_backend.dto.response;

import java.util.List;

public record HotelLocationOptionResponse(
        String province,
        List<String> districts
) {
}
