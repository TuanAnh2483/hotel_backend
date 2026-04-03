package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.BookingContact;
import com.hotel.hotel_backend.entity.BookingItem;

import java.time.LocalDate;
import java.util.List;

public record BookingResponse (
        Long bookingId,
        LocalDate checkIn,
        LocalDate checkout,
        String status,
        List<BookingItem> bookingItems,
        BookingContactResponse  contact
){}

