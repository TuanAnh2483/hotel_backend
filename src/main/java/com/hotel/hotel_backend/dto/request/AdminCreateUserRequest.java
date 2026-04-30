package com.hotel.hotel_backend.dto.request;

import com.hotel.hotel_backend.entity.UserType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminCreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        @NotNull UserType userType
) {
}
