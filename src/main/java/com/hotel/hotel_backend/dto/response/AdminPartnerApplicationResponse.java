package com.hotel.hotel_backend.dto.response;

public record AdminPartnerApplicationResponse(
        Long id,
        Long userId,
        String email,
        String phone,
        String businessName,
        String status,
        String taxCode,
        String propertyType
) {
}
