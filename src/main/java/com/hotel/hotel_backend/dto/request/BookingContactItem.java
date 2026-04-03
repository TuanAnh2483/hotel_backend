package com.hotel.hotel_backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record BookingContactItem(
        @Valid
        @NotNull(message = "contact is required")
        BookingContactRequest contact
) {}
