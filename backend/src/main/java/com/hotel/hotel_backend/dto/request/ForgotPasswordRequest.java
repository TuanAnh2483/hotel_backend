package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @Email
        @NotBlank(message = "email is required")
        String email
) {}
