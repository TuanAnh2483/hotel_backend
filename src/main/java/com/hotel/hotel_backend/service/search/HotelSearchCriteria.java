package com.hotel.hotel_backend.service.search;

import java.time.LocalDate;

public record HotelSearchCriteria(
        String province,
        String district,
        LocalDate checkIn,
        LocalDate checkOut,
        Integer adults,
        Integer rooms
) {
}
