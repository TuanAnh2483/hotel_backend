package com.hotel.hotel_backend.controller;



import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.BookingPaymentTransactionResponse;
import com.hotel.hotel_backend.dto.request.BookingPaymentRequest;
import com.hotel.hotel_backend.dto.request.BookingQuoteRequest;
import com.hotel.hotel_backend.dto.request.CreateRefundRequest;
import com.hotel.hotel_backend.dto.response.BookingQuoteResponse;
import com.hotel.hotel_backend.dto.request.CreateBookingRequest;
import com.hotel.hotel_backend.dto.response.BookingResponse;
import com.hotel.hotel_backend.dto.response.PaymentReconcileResponse;
import com.hotel.hotel_backend.dto.response.PaymentSessionResponse;
import com.hotel.hotel_backend.dto.response.RefundRequestResponse;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.security.JwtPrincipal;
import com.hotel.hotel_backend.service.BookingPaymentGatewayService;
import com.hotel.hotel_backend.service.BookingService;
import com.hotel.hotel_backend.service.RefundRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

@Tag(name = "Booking", description = "Create bookings, quote price, pay, cancel, refund requests")
@RestController
@RequestMapping({"/api/v1/bookings", "/api/bookings"})
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final RefundRequestService refundRequestService;
    private final BookingPaymentGatewayService bookingPaymentGatewayService;


    /*
     * API tạo booking
     */
    @PostMapping("/quote")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<BookingQuoteResponse> quoteBooking(@Valid @RequestBody BookingQuoteRequest request) {
        return ApiResponse.ok(bookingService.quoteBooking(request));
    }

    @PostMapping()
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(@Valid @RequestBody CreateBookingRequest request,
                                 @AuthenticationPrincipal JwtPrincipal principal) {
        BookingResponse booking = bookingService.createBooking(requireUserId(principal), request);
        URI location = URI.create("/api/v1/bookings/" + booking.bookingId());
        return ResponseEntity.created(location).body(ApiResponse.ok(booking));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<BookingResponse>> getMyBookings(@AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(bookingService.getMyBookings(requireUserId(principal)));
    }

    @GetMapping("/{bookingId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<BookingResponse> getMyBooking(@PathVariable Long bookingId,
                                                     @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(bookingService.getMyBooking(requireUserId(principal), bookingId));
    }

    @PostMapping("/{bookingId}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<BookingResponse> payBooking(@PathVariable Long bookingId,
                                                   @Valid @RequestBody BookingPaymentRequest request,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(bookingService.payBooking(requireUserId(principal), bookingId, request));
    }

    @GetMapping("/{bookingId}/payments")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<BookingPaymentTransactionResponse>> getMyBookingPayments(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ApiResponse.ok(bookingService.getMyBookingPayments(requireUserId(principal), bookingId));
    }

    @PostMapping("/{bookingId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<BookingResponse> cancelBooking(@PathVariable Long bookingId,
                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(bookingService.cancelBooking(requireUserId(principal), bookingId));
    }

    @GetMapping("/{bookingId}/refund-request")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<RefundRequestResponse> getMyRefundRequest(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ApiResponse.ok(refundRequestService.getMyRefundRequest(requireUserId(principal), bookingId));
    }

    @PostMapping("/{bookingId}/refund-request")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<RefundRequestResponse> createRefundRequest(
            @PathVariable Long bookingId,
            @Valid @RequestBody CreateRefundRequest request,
            @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ApiResponse.ok(refundRequestService.createMyRefundRequest(requireUserId(principal), bookingId, request));
    }
    @PostMapping("/{bookingId}/payment-session")
    @PreAuthorize("hasRole('CUSTOMER')")
    /*
     * Customer gọi endpoint này khi mở màn thanh toán.
     *
     * Endpoint chỉ tạo dữ liệu hướng dẫn chuyển khoản, chưa xác nhận booking.
     * Booking chỉ được xác nhận sau khi webhook SePay báo giao dịch tiền vào
     * và service match được paymentCode với transaction PENDING.
     */
    public ApiResponse<PaymentSessionResponse> createPaymentSession(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ApiResponse.ok(bookingPaymentGatewayService.createPaymentSession(requireUserId(principal), bookingId));
    }

    /*
     * Customer bấm "Tôi đã chuyển khoản" -> backend chủ động đối soát với SePay
     * Transaction API thay vì chỉ chờ webhook. Nếu tìm thấy giao dịch khớp
     * paymentCode + số tiền thì confirm booking ngay (idempotent).
     */
    @PostMapping("/{bookingId}/payment-session/reconcile")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PaymentReconcileResponse> reconcilePayment(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal JwtPrincipal principal
    ) {
        return ApiResponse.ok(bookingPaymentGatewayService.reconcilePayment(requireUserId(principal), bookingId));
    }

    private Long requireUserId(JwtPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return principal.userId();
    }
}
