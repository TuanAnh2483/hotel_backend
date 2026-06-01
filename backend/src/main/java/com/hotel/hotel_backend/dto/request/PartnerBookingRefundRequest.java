package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PartnerBookingRefundRequest(
        @NotBlank(message = "clientRequestId is required")
        String clientRequestId
) {}
