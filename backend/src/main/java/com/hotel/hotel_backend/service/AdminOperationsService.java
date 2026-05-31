package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.AdminCreateUserRequest;
import com.hotel.hotel_backend.dto.request.AdminUpdateHotelRequest;
import com.hotel.hotel_backend.dto.response.AdminBookingResponse;
import com.hotel.hotel_backend.dto.response.AdminHotelResponse;
import com.hotel.hotel_backend.dto.response.AdminRoomResponse;
import com.hotel.hotel_backend.dto.response.AdminReviewResponse;
import com.hotel.hotel_backend.dto.response.AdminStatsResponse;
import com.hotel.hotel_backend.dto.response.AdminSystemDataResponse;
import com.hotel.hotel_backend.dto.response.AdminSystemFlaggedBookingResponse;
import com.hotel.hotel_backend.dto.response.AdminSystemRecentErrorResponse;
import com.hotel.hotel_backend.dto.response.AdminUserResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingMode;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelReview;
import com.hotel.hotel_backend.entity.PaymentTransactionStatus;
import com.hotel.hotel_backend.entity.RefundRequestStatus;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.HotelReviewRepository;
import com.hotel.hotel_backend.repository.PartnerApplicationRepository;
import com.hotel.hotel_backend.repository.PaymentTransactionRepository;
import com.hotel.hotel_backend.repository.RefundRequestRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminOperationsService {

    private final UserRepository userRepository;
    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final HotelReviewRepository hotelReviewRepository;
    private final PartnerApplicationRepository partnerApplicationRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final HotelReviewService hotelReviewService;

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        return new AdminStatsResponse(
                userRepository.countByUserType(UserType.CUSTOMER),
                userRepository.countByUserType(UserType.PARTNER),
                hotelRepository.count(),
                bookingRepository.count(),
                bookingRepository.countByStatus(BookingStatus.PENDING_PAYMENT)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers() {
        // Build userId -> taxCode map from latest partner application per user
        Map<Long, String> taxCodeByUserId = partnerApplicationRepository.findAll().stream()
                .collect(Collectors.toMap(
                        a -> a.getUser().getId(),
                        a -> a.getTaxCode() != null ? a.getTaxCode() : "",
                        (existing, replacement) -> replacement  // keep latest (list ordered by id desc not guaranteed, so last write wins)
                ));

        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getUserType(),
                        user.getStatus(),
                        user.getCreatedAt(),
                        taxCodeByUserId.getOrDefault(user.getId(), null)
                ))
                .toList();
    }

    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        UserType userType = request.userType();
        if (userType != UserType.CUSTOMER && userType != UserType.PARTNER) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Only CUSTOMER or PARTNER can be created here");
        }

        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS, "Email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setUserType(userType);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(OffsetDateTime.now());

        User savedUser = userRepository.save(user);
        return new AdminUserResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getUserType(),
                savedUser.getStatus(),
                savedUser.getCreatedAt(),
                null
        );
    }

    public AdminUserResponse toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "User not found"));

        if (user.getUserType() == UserType.ADMIN) {
            throw new ApiException(ErrorCode.CONFLICT, "Admin account cannot be locked here");
        }

        user.setStatus(user.getStatus() == UserStatus.ACTIVE ? UserStatus.LOCKED : UserStatus.ACTIVE);
        user.setTokenVersion(user.getTokenVersion() + 1);
        User savedUser = userRepository.save(user);
        return new AdminUserResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getUserType(),
                savedUser.getStatus(),
                savedUser.getCreatedAt(),
                partnerApplicationRepository.findTopByUserIdOrderByIdDesc(savedUser.getId())
                        .map(a -> a.getTaxCode())
                        .orElse(null)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminHotelResponse> getHotels() {
        return hotelRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toHotelResponse)
                .toList();
    }

    public AdminHotelResponse updateHotel(Long hotelId, AdminUpdateHotelRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Hotel not found"));

        hotel.setName(request.name());
        hotel.setAddress(request.address());
        hotel.setProvince(request.province());
        hotel.setDistrict(request.district());
        hotel.setDescription(request.description());
        hotel.setHotelType(request.hotelType());

        return toHotelResponse(hotelRepository.save(hotel));
    }

    public void deleteHotel(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Hotel not found"));

        if (roomRepository.existsByHotelId(hotelId)) {
            throw new ApiException(ErrorCode.HOTEL_HAS_ROOMS);
        }

        hotelRepository.delete(hotel);
    }

    @Transactional(readOnly = true)
    public List<AdminBookingResponse> getBookings() {
        List<Booking> bookings = bookingRepository.findAllForAdmin();
        Map<Long, String> emailsByUserId = userRepository.findAllById(
                        bookings.stream().map(Booking::getUserId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));

        return bookings.stream()
                .map(booking -> {
                    String hotelName = booking.getItems().isEmpty()
                            ? null
                            : booking.getItems().get(0).getRoom().getHotel().getName();
                    long nights = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
                    return new AdminBookingResponse(
                            booking.getId(),
                            emailsByUserId.get(booking.getUserId()),
                            hotelName,
                            booking.getCheckIn(),
                            booking.getCheckOut(),
                            Math.max(nights, 0),
                            booking.getTotalPrice(),
                            booking.getStatus(),
                            booking.getCreatedAt()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminReviewResponse> getReviews() {
        return hotelReviewRepository.findAllForAdmin().stream()
                .map(this::toAdminReviewResponse)
                .toList();
    }

    public void deleteReview(Long reviewId) {
        hotelReviewService.deleteReviewAsAdmin(reviewId);
    }

    @Transactional(readOnly = true)
    public AdminSystemDataResponse getSystemData() {
        List<AdminSystemFlaggedBookingResponse> flaggedBookings = refundRequestRepository
                .findAdminRequests(RefundRequestStatus.PENDING).stream()
                .map(refundRequest -> new AdminSystemFlaggedBookingResponse(
                        refundRequest.getId(),
                        refundRequest.getBooking().getId(),
                        refundRequest.getAmount() != null && refundRequest.getAmount() >= 5_000_000 ? "HIGH" : "MEDIUM",
                        "Refund request: " + refundRequest.getReason(),
                        refundRequest.getRequestedAt()
                ))
                .toList();

        List<AdminSystemRecentErrorResponse> recentErrors = paymentTransactionRepository
                .findTop10ByStatusOrderByCreatedAtDesc(PaymentTransactionStatus.FAILED).stream()
                .map(transaction -> new AdminSystemRecentErrorResponse(
                        transaction.getId(),
                        "PAYMENT_FAILED",
                        transaction.getFailureReason() == null || transaction.getFailureReason().isBlank()
                                ? "Payment failed"
                                : transaction.getFailureReason(),
                        transaction.getCreatedAt()
                ))
                .toList();

        return new AdminSystemDataResponse(flaggedBookings, recentErrors);
    }

    @Transactional(readOnly = true)
    public List<AdminRoomResponse> getHotelRooms(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Hotel not found"));
        return roomRepository.findByHotelId(hotel.getId()).stream()
                .map(room -> new AdminRoomResponse(
                        room.getId(),
                        room.getName(),
                        room.getPrice(),
                        room.getCapacity(),
                        room.getQuantity(),
                        room.getRoomCategory(),
                        room.getBedType(),
                        room.getStatus(),
                        room.getAmenities() == null ? new java.util.HashSet<>() : new java.util.HashSet<>(room.getAmenities()),
                        room.getCustomAmenities() == null ? new java.util.HashSet<>() : new java.util.HashSet<>(room.getCustomAmenities())
                ))
                .toList();
    }

    private AdminHotelResponse toHotelResponse(Hotel hotel) {
        return new AdminHotelResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getOwner().getEmail(),
                hotel.getAddress(),
                hotel.getDistrict(),
                hotel.getProvince(),
                hotel.getDescription(),
                hotel.getHotelType(),
                hotel.getBookingMode() != null ? hotel.getBookingMode() : com.hotel.hotel_backend.entity.BookingMode.BY_ROOM,
                hotel.getStatus(),
                hotel.getRatingAvg(),
                hotel.getRatingCount(),
                hotel.getCreatedAt(),
                hotel.getAmenities() == null ? new java.util.HashSet<>() : new java.util.HashSet<>(hotel.getAmenities()),
                hotel.getCustomAmenities() == null ? new java.util.HashSet<>() : new java.util.HashSet<>(hotel.getCustomAmenities())
        );
    }

    private AdminReviewResponse toAdminReviewResponse(HotelReview review) {
        return new AdminReviewResponse(
                review.getId(),
                review.getBooking().getId(),
                review.getHotel().getId(),
                review.getHotel().getName(),
                review.getUser().getEmail(),
                review.getRating(),
                review.getComment(),
                review.getPartnerReply(),
                review.getCreatedAt()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
