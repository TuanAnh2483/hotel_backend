package com.hotel.hotel_backend.dto.request;

import java.time.LocalDate;

public record UpdateMyProfileRequest(
        String fullName,
        String contactEmail,
        String phone,
        String address,
        LocalDate dateOfBirth,
        String bio,
        String brandName,
        String taxCode,
        String representativeName,
        String businessType,
        LocalDate foundedDate,
        String website
) {
}
