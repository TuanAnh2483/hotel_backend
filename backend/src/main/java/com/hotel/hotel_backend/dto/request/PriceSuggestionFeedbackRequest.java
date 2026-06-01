package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PriceSuggestionFeedbackRequest(
        @NotBlank String date,
        @NotNull Long suggested,
        Long appliedPrice,   // actual price applied; null when SKIPPED
        @NotBlank @Pattern(regexp = "APPLIED|APPLIED_MINUS5|SKIPPED") String outcome
) {}

