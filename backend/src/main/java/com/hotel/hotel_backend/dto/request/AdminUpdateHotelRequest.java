package com.hotel.hotel_backend.dto.request;

import com.hotel.hotel_backend.entity.HotelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminUpdateHotelRequest(
        @NotBlank String name,
        @NotBlank String address,
        @NotBlank String province,
        @NotBlank String district,
        String description,
        @NotNull HotelType hotelType,

        // Toạ độ do admin chỉnh. Nếu null thì giữ nguyên toạ độ hiện có.
        Double latitude,
        Double longitude
) {
}
