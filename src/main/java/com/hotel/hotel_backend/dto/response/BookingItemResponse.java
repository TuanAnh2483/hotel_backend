package com.hotel.hotel_backend.dto.response;

import java.math.BigDecimal;

public record BookingItemResponse(

        Long roomTypeId,
        String roomTypeName,
        Integer quantity,
        BigDecimal price
){}
