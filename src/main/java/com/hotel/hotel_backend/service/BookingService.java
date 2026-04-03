package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.CreateBookingRequest;
import com.hotel.hotel_backend.dto.response.BookingResponse;
import com.hotel.hotel_backend.entity.Booking;

import java.util.List;

public interface BookingService {
    BookingResponse createBooking(Long userId, CreateBookingRequest  request);

    List<Booking> getMyBookings(Long userId);


    Booking cancelBooking(Long userId, Long bookingId);



}
