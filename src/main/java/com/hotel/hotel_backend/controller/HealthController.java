package com.hotel.hotel_backend.controller;


import com.hotel.hotel_backend.dto.response.ApiResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<String>  health() {
        return ApiResponse.ok("ok");
    }
}
