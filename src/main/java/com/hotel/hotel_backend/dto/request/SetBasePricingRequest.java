package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SetBasePricingRequest(

        @NotNull(message = "basePrice is required")
        @Min(value = 0, message = "basePrice must be >= 0")
        Long basePrice,

        @Min(value = 1, message = "minStay must be at least 1")
        Integer minStay
) {}