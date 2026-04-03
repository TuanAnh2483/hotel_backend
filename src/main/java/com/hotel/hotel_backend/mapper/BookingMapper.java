package com.hotel.hotel_backend.mapper;


import com.hotel.hotel_backend.dto.request.BookingContactRequest;
import com.hotel.hotel_backend.dto.request.CreateBookingRequest;
import com.hotel.hotel_backend.dto.response.BookingResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingContact;
import org.springframework.stereotype.Component;
import org.modelmapper.ModelMapper;

import static com.hotel.hotel_backend.entity.BookingStatus.PENDING;


@Component
public class BookingMapper {

    private final ModelMapper modelMapper ;

    public BookingMapper(ModelMapper modelMapper) {
        this.modelMapper = modelMapper;
    }
    /**
     * Convert CreateBookingRequest → Booking Entity
     */
    public Booking toBooking(CreateBookingRequest bookingRequest) {
         Booking booking = modelMapper.map(bookingRequest, Booking.class);
         booking.setStatus(PENDING);
         return booking;
    }

    /**
     * Convert CreateBookingRequest → Booking Entity
     */

    public BookingContact toBookingContact(BookingContactRequest bookingContactRequest) {
        // ModelMapper tự động copy field
        BookingContact  bookingContact = modelMapper.map(bookingContactRequest, BookingContact.class);
        return bookingContact;
    }

    // convert entity thành response DTO
    public BookingResponse toBookingResponse(Booking booking) {
        return modelMapper.map(booking, BookingResponse.class);

    }






}
