package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

import jakarta.validation.constraints.Min;

public record CreateRoomRequest(

        @NotBlank(message = "Room name is required")
        String name,

        @NotNull
        @Min(value = 1, message = "Capacity must be at least 1")
        Integer capacity,

        @NotNull
        @Min(value = 0, message = "Quantity must be >= 0")
        Integer quantity,

        @NotNull
        @Min(value = 0, message = "Price must be >= 0")
        Long price
) {}