package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.CreateHotelReviewRequest;
import com.hotel.hotel_backend.dto.request.UpdateHotelReviewRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.HotelReviewResponse;
import com.hotel.hotel_backend.dto.response.MyReviewResponse;
import com.hotel.hotel_backend.service.HotelReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final HotelReviewService hotelReviewService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<java.util.List<MyReviewResponse>> getMyReviews() {
        return ApiResponse.ok(hotelReviewService.getMyReviews());
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<HotelReviewResponse> createReview(@Valid @RequestBody CreateHotelReviewRequest request) {
        return ApiResponse.ok(hotelReviewService.createReview(request));
    }

    @PutMapping("/{reviewId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<HotelReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateHotelReviewRequest request
    ) {
        return ApiResponse.ok(hotelReviewService.updateMyReview(reviewId, request));
    }

    @DeleteMapping("/{reviewId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<Void> deleteReview(@PathVariable Long reviewId) {
        hotelReviewService.deleteMyReview(reviewId);
        return ApiResponse.ok(null);
    }
}
