package com.hotel.hotel_backend.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record BookingRoomRequest(
        @NotNull(message = "roomTypeId is required")
        @JsonAlias({"roomId", "RoomTypeId"})
        Long roomTypeId,

        @NotNull(message = "quantity is required")
        @Min(value = 1, message = "quantity must be greater than 0")
        Integer quantity
) {}
