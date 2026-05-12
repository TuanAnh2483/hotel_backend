package com.hotel.hotel_backend.dto.request;



import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StartPartnerRequest
       (
               @NotBlank(message = "Business name must not be blank")

               String businessName,
               @Email @NotBlank
                       String email,
               @NotBlank @Size(min = 8, max =10)
               String phone
       )
{}

