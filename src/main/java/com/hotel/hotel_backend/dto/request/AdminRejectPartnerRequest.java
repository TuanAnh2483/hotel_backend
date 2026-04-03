package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AdminRejectPartnerRequest(
        @NotBlank String reason
) {
}
