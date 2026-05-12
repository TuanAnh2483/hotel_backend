package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.response.MyNotificationResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.UserNotification;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class UserNotificationService {

    private static final String REVIEW_TYPE = "REVIEW";

    private final UserNotificationRepository userNotificationRepository;
    private final SecurityService securityService;

    public void createCheckoutReviewNotification(Booking booking) {
        if (booking == null || booking.getId() == null || booking.getUserId() == null) {
            return;
        }

        if (userNotificationRepository
                .findByUserIdAndTypeAndBookingId(booking.getUserId(), REVIEW_TYPE, booking.getId())
                .isPresent()) {
            return;
        }

        userNotificationRepository.save(buildCheckoutReviewNotification(booking));
    }

    public void ensureCheckoutReviewNotifications(List<Booking> completedBookings) {
        if (completedBookings == null || completedBookings.isEmpty()) {
            return;
        }

        Long userId = completedBookings.get(0).getUserId();
        List<Long> bookingIds = completedBookings.stream()
                .map(Booking::getId)
                .filter(id -> id != null)
                .toList();
        if (bookingIds.isEmpty()) {
            return;
        }

        Set<Long> existingIds = new HashSet<>(
                userNotificationRepository.findExistingBookingIds(userId, REVIEW_TYPE, bookingIds)
        );

        List<UserNotification> missingNotifications = completedBookings.stream()
                .filter(booking -> booking.getId() != null && !existingIds.contains(booking.getId()))
                .map(this::buildCheckoutReviewNotification)
                .toList();

        if (!missingNotifications.isEmpty()) {
            userNotificationRepository.saveAll(missingNotifications);
        }
    }

    @Transactional(readOnly = true)
    public List<MyNotificationResponse> getNotifications(Long userId) {
        return userNotificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public void markReviewNotificationCompleted(Booking booking) {
        if (booking == null || booking.getId() == null || booking.getUserId() == null) {
            return;
        }

        userNotificationRepository
                .findByUserIdAndTypeAndBookingId(booking.getUserId(), REVIEW_TYPE, booking.getId())
                .ifPresent(notification -> {
                    notification.setTitle("Cảm ơn bạn đã đánh giá " + resolveHotelName(booking));
                    notification.setMessage("Đánh giá của bạn cho booking #" + booking.getId() + " đã được ghi nhận.");
                    notification.setActionUrl("/customer/reviews");
                    if (notification.getReadAt() == null) {
                        notification.setReadAt(OffsetDateTime.now());
                    }
                    userNotificationRepository.save(notification);
                });
    }

    public MyNotificationResponse markMyNotificationRead(Long notificationId) {
        Long userId = securityService.getCurrentPrincipal().userId();
        UserNotification notification = userNotificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Notification not found"));

        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
        }

        return toResponse(userNotificationRepository.save(notification));
    }

    private UserNotification buildCheckoutReviewNotification(Booking booking) {
        String hotelName = resolveHotelName(booking);

        UserNotification notification = new UserNotification();
        notification.setUserId(booking.getUserId());
        notification.setType(REVIEW_TYPE);
        notification.setTitle("Cảm ơn bạn đã lưu trú tại " + hotelName);
        notification.setMessage("Booking #" + booking.getId() + " đã hoàn tất. Bạn có thể gửi đánh giá để chia sẻ trải nghiệm dịch vụ.");
        notification.setBookingId(booking.getId());
        notification.setActionUrl("/customer/reviews");
        return notification;
    }

    private String resolveHotelName(Booking booking) {
        if (booking.getItems() == null || booking.getItems().isEmpty()) {
            return "khách sạn";
        }

        Hotel hotel = booking.getItems().get(0).getRoom().getHotel();
        return hotel != null ? hotel.getName() : "khách sạn";
    }

    private MyNotificationResponse toResponse(UserNotification notification) {
        return new MyNotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getCreatedAt().toString(),
                notification.getReadAt() != null,
                notification.getReadAt() != null ? notification.getReadAt().toString() : null,
                notification.getActionUrl()
        );
    }
}
