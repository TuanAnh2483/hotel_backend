package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PartnerReviewReplyRequest(
        @NotBlank(message = "reply is required")
        @Size(max = 1000, message = "reply must be <= 1000 characters")
        String reply
) {}
