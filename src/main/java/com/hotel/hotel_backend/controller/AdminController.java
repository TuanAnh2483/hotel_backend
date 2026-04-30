package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.AdminCreateUserRequest;
import com.hotel.hotel_backend.dto.request.AdminRejectPartnerRequest;
import com.hotel.hotel_backend.dto.request.AdminUpdateHotelRequest;
import com.hotel.hotel_backend.dto.response.AdminPartnerApplicationResponse;
import com.hotel.hotel_backend.dto.response.AdminBookingResponse;
import com.hotel.hotel_backend.dto.response.AdminHotelResponse;
import com.hotel.hotel_backend.dto.response.AdminReviewResponse;
import com.hotel.hotel_backend.dto.response.AdminStatsResponse;
import com.hotel.hotel_backend.dto.response.AdminSystemDataResponse;
import com.hotel.hotel_backend.dto.response.AdminUserResponse;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.PartnerApplicationResponse;
import com.hotel.hotel_backend.dto.response.RefundRequestResponse;
import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PartnerApplicationStatus;
import com.hotel.hotel_backend.entity.RefundRequestStatus;
import com.hotel.hotel_backend.service.AdminPartnerService;
import com.hotel.hotel_backend.service.AdminOperationsService;
import com.hotel.hotel_backend.service.RefundRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.hotel.hotel_backend.dto.response.ApiResponse.ok;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminPartnerService adminPartnerService;
    private final AdminOperationsService adminOperationsService;
    private final RefundRequestService refundRequestService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminStatsResponse> getStats() {
        return ok(adminOperationsService.getStats());
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminUserResponse>> getUsers() {
        return ok(adminOperationsService.getUsers());
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return ok(adminOperationsService.createUser(request));
    }

    @PostMapping("/users/{userId}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminUserResponse> toggleUserStatus(@PathVariable Long userId) {
        return ok(adminOperationsService.toggleUserStatus(userId));
    }

    @GetMapping("/hotels")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminHotelResponse>> getHotels() {
        return ok(adminOperationsService.getHotels());
    }

    @PutMapping("/hotels/{hotelId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminHotelResponse> updateHotel(
            @PathVariable Long hotelId,
            @Valid @RequestBody AdminUpdateHotelRequest request
    ) {
        return ok(adminOperationsService.updateHotel(hotelId, request));
    }

    @DeleteMapping("/hotels/{hotelId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteHotel(@PathVariable Long hotelId) {
        adminOperationsService.deleteHotel(hotelId);
        return ok(null);
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminBookingResponse>> getBookings() {
        return ok(adminOperationsService.getBookings());
    }

    @GetMapping("/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminReviewResponse>> getReviews() {
        return ok(adminOperationsService.getReviews());
    }

    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteReview(@PathVariable Long reviewId) {
        adminOperationsService.deleteReview(reviewId);
        return ok(null);
    }

    @GetMapping("/refunds")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<RefundRequestResponse>> getRefundRequests(
            @RequestParam(required = false) RefundRequestStatus status
    ) {
        return ok(refundRequestService.getAdminRefundRequests(status));
    }

    @PostMapping("/refunds/{refundRequestId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RefundRequestResponse> approveRefundRequest(@PathVariable Long refundRequestId) {
        return ok(refundRequestService.approveAdminRefundRequest(refundRequestId));
    }

    @PostMapping("/refunds/{refundRequestId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RefundRequestResponse> rejectRefundRequest(@PathVariable Long refundRequestId) {
        return ok(refundRequestService.rejectAdminRefundRequest(refundRequestId));
    }

    @GetMapping("/system")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminSystemDataResponse> getSystemData() {
        return ok(adminOperationsService.getSystemData());
    }

    @GetMapping("/partner-applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminPartnerApplicationResponse>> getPartnerApplications(
            @RequestParam(required = false) PartnerApplicationStatus status
    ) {
        return ok(adminPartnerService.getApplications(status)
                .stream()
                .map(this::toAdminPartnerApplicationResponse)
                .toList());
    }

    @PostMapping("/partner-applications/{applicationId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PartnerApplicationResponse> approvePartnerApplication(@PathVariable Long applicationId) {
        return ok(toPartnerApplicationResponse(adminPartnerService.approveApplication(applicationId)));
    }

    @PostMapping("/partner-applications/{applicationId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PartnerApplicationResponse> rejectPartnerApplication(
            @PathVariable Long applicationId,
            @Valid @RequestBody AdminRejectPartnerRequest request
    ) {
        return ok(toPartnerApplicationResponse(adminPartnerService.rejectApplication(applicationId, request.reason())));
    }

    private PartnerApplicationResponse toPartnerApplicationResponse(PartnerApplication application) {
        return new PartnerApplicationResponse(
                application.getId(),
                application.getStatus().name(),
                application.getBussinessName()
        );
    }

    private AdminPartnerApplicationResponse toAdminPartnerApplicationResponse(PartnerApplication application) {
        return new AdminPartnerApplicationResponse(
                application.getId(),
                application.getUser().getId(),
                application.getEmail(),
                application.getPhoneNumber(),
                application.getBussinessName(),
                application.getStatus().name()
        );
    }
}


