package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
@Getter
@Setter
public class HotelSearchRequest {

    @NotBlank(message = "Khong duoc trong")
    private String province;


    private String district;


    @NotNull
    @DateTimeFormat (iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkIn;

    @AssertTrue(message = "checkOut must be after checkIn")
    @NotNull
    @DateTimeFormat (iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkOut;

    @NotNull
    @Min(value = 1, message = "Quantity must be >= 0")
    private Integer adults = 1;

    @NotNull
    @Min(value = 1, message = "Quantity must be >= 0")
    private Integer rooms = 1;

}
