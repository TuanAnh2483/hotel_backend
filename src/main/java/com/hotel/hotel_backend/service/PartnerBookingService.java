package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.PartnerAnalyticsSummaryRequest;
import com.hotel.hotel_backend.dto.request.PartnerBookingRefundRequest;
import com.hotel.hotel_backend.dto.request.PartnerBookingSearchRequest;
import com.hotel.hotel_backend.dto.response.BookingContactResponse;
import com.hotel.hotel_backend.dto.response.BookingItemResponse;
import com.hotel.hotel_backend.dto.response.PartnerAnalyticsHotelSummaryResponse;
import com.hotel.hotel_backend.dto.response.PartnerAnalyticsSummaryResponse;
import com.hotel.hotel_backend.dto.response.PartnerBookingDetailResponse;
import com.hotel.hotel_backend.dto.response.PartnerBookingPageResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.PaymentMethod;
import com.hotel.hotel_backend.entity.PaymentTransaction;
import com.hotel.hotel_backend.entity.PaymentTransactionStatus;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerBookingService {

    private final BookingRepository bookingRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final SecurityService securityService;
    private final BookingExpirationService bookingExpirationService;

    public PartnerBookingPageResponse getPartnerBookings(PartnerBookingSearchRequest request) {
        // V1 ưu tiên consistency của dashboard: expire booking pending quá hạn trước khi query list.
        bookingExpirationService.expireOverduePendingBookings();

        long ownerId = securityService.getCurrentPrincipal().userId();
        PageRequest pageRequest = PageRequest.of(request.getPage() - 1, request.getSize());
        Page<com.hotel.hotel_backend.dto.response.PartnerBookingSummaryResponse> page =
                bookingRepository.findPartnerBookingSummaries(
                        ownerId,
                        request.getHotelId(),
                        request.getStatus(),
                        request.getCheckInFrom(),
                        request.getCheckInTo(),
                        pageRequest
                );

        return new PartnerBookingPageResponse(
                page.getContent(),
                request.getPage(),
                request.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }

    public PartnerBookingDetailResponse getPartnerBooking(Long bookingId) {
        Booking booking = loadOwnedBooking(bookingId);
        booking = bookingExpirationService.expirePendingBookingIfNeeded(booking);
        return toPartnerBookingDetail(booking);
    }

    @Transactional
    public PartnerBookingDetailResponse completePartnerBooking(Long bookingId) {
        Booking booking = loadOwnedBooking(bookingId);
        booking = bookingExpirationService.expirePendingBookingIfNeeded(booking);

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            return toPartnerBookingDetail(booking);
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(ErrorCode.CONFLICT, "Only confirmed bookings can be completed");
        }

        if (booking.getCheckOut().isAfter(LocalDate.now())) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking cannot be completed before checkout date");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        return toPartnerBookingDetail(bookingRepository.save(booking));
    }

    @Transactional
    public PartnerBookingDetailResponse refundPartnerBooking(Long bookingId, PartnerBookingRefundRequest request) {
        Booking booking = loadOwnedBooking(bookingId);
        booking = bookingExpirationService.expirePendingBookingIfNeeded(booking);

        PaymentTransaction existingTransaction = paymentTransactionRepository
                .findByBookingIdAndClientRequestId(bookingId, request.clientRequestId())
                .orElse(null);

        if (existingTransaction != null) {
            if (isSuccessfulRefund(existingTransaction)) {
                return toPartnerBookingDetail(booking);
            }
            throw new ApiException(ErrorCode.CONFLICT, "clientRequestId already used");
        }

        if (booking.getStatus() == BookingStatus.REFUNDED) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking already refunded");
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            if (!booking.getCheckIn().isAfter(LocalDate.now())) {
                throw new ApiException(
                        ErrorCode.CONFLICT,
                        "Only future confirmed bookings can be refunded"
                );
            }
            bookingExpirationService.releaseReservedInventory(booking);
        } else if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new ApiException(ErrorCode.CONFLICT, "Only paid bookings can be refunded");
        }

        booking.setStatus(BookingStatus.REFUNDED);
        booking.setExpiresAt(null);
        Booking savedBooking = bookingRepository.save(booking);
        recordRefundTransaction(savedBooking, request.clientRequestId());
        return toPartnerBookingDetail(savedBooking);
    }

    public PartnerAnalyticsSummaryResponse getPartnerAnalytics(PartnerAnalyticsSummaryRequest request) {
        bookingExpirationService.expireOverduePendingBookings();

        long ownerId = securityService.getCurrentPrincipal().userId();
        List<Booking> rawBookings = bookingRepository.findPartnerBookingsForAnalytics(
                ownerId,
                request.getHotelId(),
                request.getCheckInFrom(),
                request.getCheckInTo()
        );

        Map<Long, Booking> bookingsById = new LinkedHashMap<>();
        for (Booking booking : rawBookings) {
            bookingsById.putIfAbsent(booking.getId(), booking);
        }

        AnalyticsAccumulator overall = new AnalyticsAccumulator(null, "ALL");
        Map<Long, AnalyticsAccumulator> hotels = new LinkedHashMap<>();

        for (Booking booking : bookingsById.values()) {
            if (booking.getItems().isEmpty()) {
                continue;
            }

            Hotel hotel = booking.getItems().get(0).getRoom().getHotel();
            overall.add(booking);
            hotels.computeIfAbsent(
                            hotel.getId(),
                            ignored -> new AnalyticsAccumulator(hotel.getId(), hotel.getName())
                    )
                    .add(booking);
        }

        List<PartnerAnalyticsHotelSummaryResponse> hotelSummaries = hotels.values().stream()
                .map(AnalyticsAccumulator::toHotelResponse)
                .toList();

        return new PartnerAnalyticsSummaryResponse(
                request.getHotelId(),
                request.getCheckInFrom(),
                request.getCheckInTo(),
                overall.totalBookings,
                overall.pendingPaymentBookings,
                overall.confirmedBookings,
                overall.completedBookings,
                overall.refundedBookings,
                overall.cancelledBookings,
                overall.grossRevenue,
                overall.refundedAmount,
                overall.netRevenue(),
                hotelSummaries
        );
    }

    private Booking loadOwnedBooking(Long bookingId) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        return bookingRepository.findPartnerBookingDetailById(ownerId, bookingId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Booking not found"));
    }

    private PartnerBookingDetailResponse toPartnerBookingDetail(Booking booking) {
        if (booking.getItems().isEmpty()) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking items are missing");
        }

        Hotel hotel = booking.getItems().get(0).getRoom().getHotel();
        BookingContactResponse contactResponse = null;
        if (booking.getContact() != null) {
            contactResponse = new BookingContactResponse(
                    booking.getContact().getName(),
                    booking.getContact().getEmail(),
                    booking.getContact().getPhone()
            );
        }

        return new PartnerBookingDetailResponse(
                booking.getId(),
                hotel.getId(),
                hotel.getName(),
                booking.getUserId(),
                booking.getCheckIn(),
                booking.getCheckOut(),
                booking.getTotalPrice(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getUpdatedAt(),
                booking.getExpiresAt(),
                booking.getItems().stream()
                        .map(item -> new BookingItemResponse(
                                item.getRoom().getId(),
                                item.getRoom().getName(),
                                item.getQuantity(),
                                item.getPrice()
                        ))
                        .toList(),
                contactResponse
        );
    }

    private boolean isSuccessfulRefund(PaymentTransaction paymentTransaction) {
        return paymentTransaction.getStatus() == PaymentTransactionStatus.SUCCESS
                && paymentTransaction.getAmount() != null
                && paymentTransaction.getAmount() < 0;
    }

    private void recordRefundTransaction(Booking booking, String clientRequestId) {
        PaymentTransaction refundTransaction = PaymentTransaction.builder()
                .booking(booking)
                .method(PaymentMethod.SIMULATED)
                .status(PaymentTransactionStatus.SUCCESS)
                .amount(-Math.abs(booking.getTotalPrice()))
                .providerReference("SIM-REFUND-" + UUID.randomUUID())
                .clientRequestId(clientRequestId)
                .build();
        paymentTransactionRepository.save(refundTransaction);
    }

    private static final class AnalyticsAccumulator {
        private final Long hotelId;
        private final String hotelName;
        private long totalBookings;
        private long pendingPaymentBookings;
        private long confirmedBookings;
        private long completedBookings;
        private long refundedBookings;
        private long cancelledBookings;
        private double grossRevenue;
        private double refundedAmount;

        private AnalyticsAccumulator(Long hotelId, String hotelName) {
            this.hotelId = hotelId;
            this.hotelName = hotelName;
        }

        private void add(Booking booking) {
            totalBookings++;
            double amount = booking.getTotalPrice() != null ? booking.getTotalPrice() : 0.0;

            switch (booking.getStatus()) {
                case PENDING_PAYMENT -> pendingPaymentBookings++;
                case CONFIRMED -> {
                    confirmedBookings++;
                    grossRevenue += amount;
                }
                case COMPLETED -> {
                    completedBookings++;
                    grossRevenue += amount;
                }
                case REFUNDED -> {
                    refundedBookings++;
                    grossRevenue += amount;
                    refundedAmount += amount;
                }
                case CANCELLED -> cancelledBookings++;
            }
        }

        private double netRevenue() {
            return grossRevenue - refundedAmount;
        }

        private PartnerAnalyticsHotelSummaryResponse toHotelResponse() {
            return new PartnerAnalyticsHotelSummaryResponse(
                    hotelId,
                    hotelName,
                    totalBookings,
                    pendingPaymentBookings,
                    confirmedBookings,
                    completedBookings,
                    refundedBookings,
                    cancelledBookings,
                    grossRevenue,
                    refundedAmount,
                    netRevenue()
            );
        }
    }
}
