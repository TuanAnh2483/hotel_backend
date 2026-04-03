package com.hotel.hotel_backend.controller;


import com.hotel.hotel_backend.dto.request.TestCreateRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @PostMapping
    public ApiResponse<String> create(@RequestBody @Valid TestCreateRequest request) {
        return ApiResponse.ok("created");
    }
}
