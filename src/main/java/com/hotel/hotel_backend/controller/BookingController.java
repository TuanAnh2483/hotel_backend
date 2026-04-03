package com.hotel.hotel_backend.controller;



import com.hotel.hotel_backend.dto.request.CreateBookingRequest;
import com.hotel.hotel_backend.dto.response.BookingResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.security.JwtPrincipal;
import com.hotel.hotel_backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;


    /*
     * API tạo booking
     */
    @PostMapping()
    @PreAuthorize("hasRole('CUSTOMER')")
    public BookingResponse createBooking(@Valid @RequestBody CreateBookingRequest request,
                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return bookingService.createBooking(requireUserId(principal), request);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<Booking> getMyBookings(@AuthenticationPrincipal JwtPrincipal principal) {
        return bookingService.getMyBookings(requireUserId(principal));
    }

    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Booking cancelBooking(@PathVariable Long bookingId,
                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return bookingService.cancelBooking(requireUserId(principal), bookingId);
    }

    private Long requireUserId(JwtPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return principal.userId();
         
    }
}
