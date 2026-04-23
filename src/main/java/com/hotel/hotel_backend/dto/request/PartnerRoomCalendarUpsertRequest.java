package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PartnerRoomCalendarUpsertRequest(
        @NotNull(message = "startDate is required")
        LocalDate startDate,

        @NotNull(message = "endDate is required")
        LocalDate endDate,

        @Min(value = 0, message = "Price must be >= 0")
        Long price,

        @Min(value = 1, message = "minStay must be at least 1")
        Integer minStay,

        Boolean closed,

        @Min(value = 0, message = "availableRooms must be >= 0")
        Integer availableRooms
) {}
