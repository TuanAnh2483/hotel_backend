package com.hotel.hotel_backend.controller;


import com.hotel.hotel_backend.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Health", description = "Application health check")
@RestController
@RequestMapping({"/api/v1", "/api"})
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<String>  health() {
        return ApiResponse.ok("ok");
    }
}
