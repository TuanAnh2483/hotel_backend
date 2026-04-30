package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.ChangePasswordRequest;
import com.hotel.hotel_backend.dto.request.UpdateMyProfileRequest;
import com.hotel.hotel_backend.dto.request.UpdateNotificationPreferencesRequest;
import com.hotel.hotel_backend.dto.response.MyBillingItemResponse;
import com.hotel.hotel_backend.dto.response.MyNotificationResponse;
import com.hotel.hotel_backend.dto.response.MyProfileResponse;
import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PaymentTransaction;
import com.hotel.hotel_backend.entity.RefundRequest;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserProfile;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.entity.PaymentTransactionStatus;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.BadRequestException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.PartnerApplicationRepository;
import com.hotel.hotel_backend.repository.PaymentTransactionRepository;
import com.hotel.hotel_backend.repository.RefundRequestRepository;
import com.hotel.hotel_backend.repository.UserProfileRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class MeService {

    private final SecurityService securityService;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final PartnerApplicationRepository partnerApplicationRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final ImageStorageRouterService imageStorageRouterService;

    public MyProfileResponse getMyProfile() {
        User currentUser = securityService.getCurrentUser();
        UserProfile profile = getOrCreateProfile(currentUser);
        return toProfileResponse(currentUser, profile);
    }

    public MyProfileResponse updateMyProfile(UpdateMyProfileRequest request) {
        User currentUser = securityService.getCurrentUser();
        UserProfile profile = getOrCreateProfile(currentUser);

        profile.setFullName(normalizeOptionalText(request.fullName()));
        profile.setContactEmail(normalizeEmailOrFallback(request.contactEmail(), currentUser.getEmail()));
        profile.setPhone(normalizeOptionalText(request.phone()));
        profile.setAddress(normalizeOptionalText(request.address()));
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setBio(normalizeOptionalText(request.bio()));
        profile.setBrandName(normalizeOptionalText(request.brandName()));
        profile.setTaxCode(normalizeOptionalText(request.taxCode()));
        profile.setRepresentativeName(normalizeOptionalText(request.representativeName()));
        profile.setBusinessType(normalizeOptionalText(request.businessType()));
        profile.setFoundedDate(request.foundedDate());
        profile.setWebsite(normalizeOptionalText(request.website()));

        return toProfileResponse(currentUser, userProfileRepository.save(profile));
    }

    public MyProfileResponse updateNotificationPreferences(UpdateNotificationPreferencesRequest request) {
        User currentUser = securityService.getCurrentUser();
        UserProfile profile = getOrCreateProfile(currentUser);

        if (request.loginAlertEnabled() != null) {
            profile.setLoginAlertEnabled(request.loginAlertEnabled());
        }
        if (request.bookingUpdateEnabled() != null) {
            profile.setBookingUpdateEnabled(request.bookingUpdateEnabled());
        }

        return toProfileResponse(currentUser, userProfileRepository.save(profile));
    }

    public MyProfileResponse uploadAvatar(MultipartFile file) {
        User currentUser = securityService.getCurrentUser();
        UserProfile profile = getOrCreateProfile(currentUser);
        String previousAvatarUrl = profile.getAvatarUrl();

        List<String> uploadedUrls = imageStorageRouterService.storeUserProfileImages(currentUser.getId(), List.of(file));
        profile.setAvatarUrl(uploadedUrls.get(0));
        UserProfile savedProfile = userProfileRepository.save(profile);

        if (StringUtils.hasText(previousAvatarUrl) && !previousAvatarUrl.equals(savedProfile.getAvatarUrl())) {
            imageStorageRouterService.deleteManagedImage(previousAvatarUrl);
        }

        return toProfileResponse(currentUser, savedProfile);
    }

    @Transactional(readOnly = true)
    public List<MyBillingItemResponse> getMyBillingItems() {
        User currentUser = securityService.getCurrentUser();
        if (currentUser.getUserType() == UserType.ADMIN) {
            return List.of();
        }
        if (currentUser.getUserType() == UserType.PARTNER) {
            return paymentTransactionRepository.findPartnerBillingItems(currentUser.getId());
        }
        return paymentTransactionRepository.findCustomerBillingItems(currentUser.getId());
    }

    @Transactional(readOnly = true)
    public List<MyNotificationResponse> getMyNotifications() {
        User currentUser = securityService.getCurrentUser();
        List<NotificationEvent> events = new ArrayList<>();

        events.add(new NotificationEvent(
                "SYSTEM",
                "Tài khoản đã được tạo",
                "Tài khoản của bạn đã sẵn sàng để sử dụng trên hệ thống.",
                currentUser.getCreatedAt()
        ));

        if (currentUser.getEmailVerifiedAt() != null) {
            events.add(new NotificationEvent(
                    "SECURITY",
                    "Email đã được xác minh",
                    "Địa chỉ email đăng nhập của bạn đã được xác minh thành công.",
                    currentUser.getEmailVerifiedAt()
            ));
        }

        if (currentUser.getUserType() == UserType.CUSTOMER) {
            paymentTransactionRepository.findCustomerBillingItems(currentUser.getId()).stream()
                    .limit(4)
                    .map(this::toPaymentNotification)
                    .forEach(events::add);

            refundRequestRepository.findCustomerRequests(currentUser.getId()).stream()
                    .limit(4)
                    .map(this::toRefundNotification)
                    .forEach(events::add);
        } else if (currentUser.getUserType() == UserType.PARTNER) {
            partnerApplicationRepository.findTopByUserIdOrderByIdDesc(currentUser.getId())
                    .map(this::toPartnerApplicationNotification)
                    .ifPresent(events::add);

            paymentTransactionRepository.findPartnerBillingItems(currentUser.getId()).stream()
                    .limit(4)
                    .map(this::toPaymentNotification)
                    .forEach(events::add);

            refundRequestRepository.findPartnerRequests(currentUser.getId(), null, null).stream()
                    .limit(4)
                    .map(this::toRefundNotification)
                    .forEach(events::add);
        } else {
            partnerApplicationRepository.findAll().stream()
                    .sorted(Comparator.comparing(this::resolveApplicationEventTime).reversed())
                    .limit(4)
                    .map(this::toPartnerApplicationNotification)
                    .forEach(events::add);

            paymentTransactionRepository.findTop10ByStatusOrderByCreatedAtDesc(com.hotel.hotel_backend.entity.PaymentTransactionStatus.FAILED).stream()
                    .limit(4)
                    .map(this::toAdminPaymentFailureNotification)
                    .forEach(events::add);
        }

        return events.stream()
                .sorted(Comparator.comparing(NotificationEvent::occurredAt).reversed())
                .limit(12)
                .map(event -> new MyNotificationResponse(
                        event.type(),
                        event.title(),
                        event.message(),
                        event.occurredAt().toString()
                ))
                .toList();
    }

    public void changePassword(ChangePasswordRequest request) {
        User currentUser = securityService.getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, "Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), currentUser.getPasswordHash())) {
            throw new ApiException(ErrorCode.CONFLICT, "New password must be different from current password");
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("confirmPassword must match newPassword", ErrorCode.VALIDATION_ERROR);
        }

        currentUser.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        currentUser.setTokenVersion(currentUser.getTokenVersion() + 1);

        UserProfile profile = getOrCreateProfile(currentUser);
        profile.setPasswordChangedAt(OffsetDateTime.now());

        userProfileRepository.save(profile);
        userRepository.save(currentUser);
    }

    private UserProfile getOrCreateProfile(User currentUser) {
        return userProfileRepository.findByUserId(currentUser.getId())
                .orElseGet(() -> userProfileRepository.save(buildDefaultProfile(currentUser)));
    }

    private UserProfile buildDefaultProfile(User currentUser) {
        UserProfile profile = new UserProfile();
        profile.setUser(currentUser);
        currentUser.setProfile(profile);
        profile.setContactEmail(currentUser.getEmail());
        profile.setPasswordChangedAt(currentUser.getCreatedAt());

        partnerApplicationRepository.findTopByUserIdOrderByIdDesc(currentUser.getId()).ifPresent(application -> {
            profile.setBrandName(normalizeOptionalText(application.getBussinessName()));
            profile.setPhone(normalizeOptionalText(application.getPhoneNumber()));
            profile.setTaxCode(normalizeOptionalText(application.getTax_code()));
            profile.setContactEmail(normalizeEmailOrFallback(application.getEmail(), currentUser.getEmail()));
        });

        return profile;
    }

    private MyProfileResponse toProfileResponse(User currentUser, UserProfile profile) {
        PartnerApplication latestApplication = partnerApplicationRepository.findTopByUserIdOrderByIdDesc(currentUser.getId())
                .orElse(null);
        long bookingCount = currentUser.getUserType() == UserType.PARTNER ? 0 : bookingRepository.countByUserId(currentUser.getId());
        long hotelCount = currentUser.getUserType() == UserType.PARTNER ? hotelRepository.countByOwnerId(currentUser.getId()) : 0;

        return new MyProfileResponse(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getUserType().name(),
                currentUser.getStatus().name(),
                currentUser.isEmailVerified(),
                currentUser.getEmailVerifiedAt(),
                resolveDisplayName(currentUser, profile, latestApplication),
                profile.getFullName(),
                profile.getContactEmail(),
                profile.getPhone(),
                profile.getAddress(),
                profile.getDateOfBirth(),
                profile.getBio(),
                profile.getAvatarUrl(),
                profile.getBrandName(),
                profile.getTaxCode(),
                profile.getRepresentativeName(),
                profile.getBusinessType(),
                profile.getFoundedDate(),
                profile.getWebsite(),
                profile.isLoginAlertEnabled(),
                profile.isBookingUpdateEnabled(),
                bookingCount,
                hotelCount,
                resolveTierLabel(currentUser.getUserType(), bookingCount, hotelCount),
                latestApplication != null ? latestApplication.getStatus().name() : currentUser.getStatus().name(),
                currentUser.getCreatedAt(),
                profile.getPasswordChangedAt()
        );
    }

    private NotificationEvent toPaymentNotification(MyBillingItemResponse billingItem) {
        boolean isRefund = billingItem.amount() != null && billingItem.amount() < 0;
        String type = isRefund ? "REFUND" : "PAYMENT";
        String title = isRefund ? "Hoàn tiền booking #" + billingItem.bookingId() : "Thanh toán booking #" + billingItem.bookingId();
        if (billingItem.status() == PaymentTransactionStatus.FAILED) {
            title = "Thanh toán booking #" + billingItem.bookingId() + " thất bại";
            type = "SYSTEM";
        }

        return new NotificationEvent(
                type,
                title,
                billingItem.description(),
                toOffsetDateTime(billingItem.createdAt())
        );
    }

    private NotificationEvent toRefundNotification(RefundRequest refundRequest) {
        OffsetDateTime occurredAt = refundRequest.getReviewedAt() != null
                ? toOffsetDateTime(refundRequest.getReviewedAt())
                : toOffsetDateTime(refundRequest.getRequestedAt());

        String title = switch (refundRequest.getStatus()) {
            case PENDING -> "Yêu cầu hoàn tiền đã được gửi";
            case APPROVED -> "Yêu cầu hoàn tiền đã được phê duyệt";
            case REJECTED -> "Yêu cầu hoàn tiền đã bị từ chối";
        };

        return new NotificationEvent(
                "REFUND",
                title,
                "Booking #" + refundRequest.getBooking().getId() + " tại " + refundRequest.getHotel().getName(),
                occurredAt
        );
    }

    private NotificationEvent toPartnerApplicationNotification(PartnerApplication application) {
        String title = switch (application.getStatus()) {
            case DRAFT -> "Hồ sơ đối tác đang ở bản nháp";
            case SUBMITTED -> "Hồ sơ đối tác đang chờ xét duyệt";
            case UNDER_REVIEW -> "Hồ sơ đối tác đang được xem xét";
            case APPROVED -> "Hồ sơ đối tác đã được phê duyệt";
            case REJECTED -> "Hồ sơ đối tác đã bị từ chối";
        };

        return new NotificationEvent(
                "SYSTEM",
                title,
                application.getBussinessName() != null
                        ? "Doanh nghiệp: " + application.getBussinessName()
                        : "Hồ sơ đối tác của bạn đã có cập nhật mới.",
                resolveApplicationEventTime(application)
        );
    }

    private NotificationEvent toAdminPaymentFailureNotification(PaymentTransaction paymentTransaction) {
        return new NotificationEvent(
                "SYSTEM",
                "Có giao dịch thất bại cần theo dõi",
                paymentTransaction.getFailureReason() != null
                        ? paymentTransaction.getFailureReason()
                        : "Booking #" + paymentTransaction.getBooking().getId() + " có thanh toán thất bại.",
                toOffsetDateTime(paymentTransaction.getCreatedAt())
        );
    }

    private OffsetDateTime resolveApplicationEventTime(PartnerApplication application) {
        return application.getUpdatedAt() != null ? application.getUpdatedAt() : application.getCreatedAt();
    }

    private OffsetDateTime toOffsetDateTime(LocalDateTime localDateTime) {
        return localDateTime.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    private String resolveDisplayName(User currentUser, UserProfile profile, PartnerApplication latestApplication) {
        if (currentUser.getUserType() == UserType.PARTNER) {
            if (StringUtils.hasText(profile.getBrandName())) {
                return profile.getBrandName().trim();
            }
            if (latestApplication != null && StringUtils.hasText(latestApplication.getBussinessName())) {
                return latestApplication.getBussinessName().trim();
            }
        }

        if (StringUtils.hasText(profile.getFullName())) {
            return profile.getFullName().trim();
        }

        String localPart = currentUser.getEmail();
        int atIndex = localPart.indexOf('@');
        if (atIndex >= 0) {
            localPart = localPart.substring(0, atIndex);
        }
        return localPart;
    }

    private String resolveTierLabel(UserType userType, long bookingCount, long hotelCount) {
        if (userType == UserType.ADMIN) {
            return "Quản trị viên";
        }
        if (userType == UserType.PARTNER) {
            if (hotelCount >= 3) {
                return "Đối tác tăng trưởng";
            }
            if (hotelCount >= 1) {
                return "Đối tác đang hoạt động";
            }
            return "Đối tác mới";
        }

        if (bookingCount >= 10) {
            return "Gold";
        }
        if (bookingCount >= 5) {
            return "Silver";
        }
        return "Explorer";
    }

    private String normalizeOptionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalizeEmailOrFallback(String value, String fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private record NotificationEvent(
            String type,
            String title,
            String message,
            OffsetDateTime occurredAt
    ) {
    }
}
