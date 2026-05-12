package com.hotel.hotel_backend.dto.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record MyProfileResponse(
        Long id,
        String email,
        String userType,
        String status,
        boolean emailVerified,
        OffsetDateTime emailVerifiedAt,
        String displayName,
        String fullName,
        String contactEmail,
        String phone,
        String address,
        LocalDate dateOfBirth,
        String bio,
        String avatarUrl,
        String brandName,
        String taxCode,
        String representativeName,
        String businessType,
        LocalDate foundedDate,
        String website,
        boolean loginAlertEnabled,
        boolean bookingUpdateEnabled,
        long bookingCount,
        long hotelCount,
        String tierLabel,
        String partnerApplicationStatus,
        OffsetDateTime createdAt,
        OffsetDateTime passwordChangedAt
) {
}
