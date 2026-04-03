package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.CurrentUserResponse;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MeController {

    private final SecurityService securityService;

    @GetMapping("/me")
    public ApiResponse<CurrentUserResponse> me() {
        User currentUser = securityService.getCurrentUser();
        return ApiResponse.ok(new CurrentUserResponse(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getUserType().name(),
                currentUser.getStatus().name()
        ));
    }
}
