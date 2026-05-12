package com.hotel.hotel_backend.dto.response;


import lombok.RequiredArgsConstructor;

public record PartnerApplicationResponse(
        Long id,
        String status,
        String businessName
)
{
}
