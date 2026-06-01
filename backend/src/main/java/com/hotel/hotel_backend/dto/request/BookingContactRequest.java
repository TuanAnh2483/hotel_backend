package com.hotel.hotel_backend.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record BookingContactRequest(
        @NotBlank(message = "nhap du info")
        String fullName,

        @JsonAlias("emailContact")
        @Email
        @NotBlank(message = "nhap du info")
        String email,

        @JsonAlias("phoneContact")
        @NotBlank(message = "nhap du info")
        String phone

) {}
