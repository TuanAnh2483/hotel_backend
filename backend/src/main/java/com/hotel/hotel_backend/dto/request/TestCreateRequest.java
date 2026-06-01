package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TestCreateRequest(
        @NotBlank(message = "name không được để trống")
        String name,

        @Email(message = "email không hợp lệ")
        @NotBlank(message = "email không được để trống")
        String email)
{}
