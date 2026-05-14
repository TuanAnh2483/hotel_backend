package com.hotel.hotel_backend.dto.request;
import jakarta.validation.constraints.NotBlank;


public record GoogleLoginRequest(
        @NotBlank(message = "Google credential is required")
        String credential
) {
}
