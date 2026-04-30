package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateRefundRequest(
        @NotBlank String reason,
        String note
) {
}
