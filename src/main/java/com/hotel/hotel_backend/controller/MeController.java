package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.ChangePasswordRequest;
import com.hotel.hotel_backend.dto.request.UpdateMyProfileRequest;
import com.hotel.hotel_backend.dto.request.UpdateNotificationPreferencesRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.CurrentUserResponse;
import com.hotel.hotel_backend.dto.response.MyBillingItemResponse;
import com.hotel.hotel_backend.dto.response.MyNotificationResponse;
import com.hotel.hotel_backend.dto.response.MyProfileResponse;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.service.MeService;
import com.hotel.hotel_backend.service.SecurityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final SecurityService securityService;
    private final MeService meService;

    @GetMapping
    public ApiResponse<CurrentUserResponse> me() {
        User currentUser = securityService.getCurrentUser();
        return ApiResponse.ok(new CurrentUserResponse(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getUserType().name(),
                currentUser.getStatus().name(),
                currentUser.isEmailVerified(),
                currentUser.getEmailVerifiedAt()
        ));
    }

    @GetMapping("/profile")
    public ApiResponse<MyProfileResponse> getMyProfile() {
        return ApiResponse.ok(meService.getMyProfile());
    }

    @PutMapping("/profile")
    public ApiResponse<MyProfileResponse> updateMyProfile(@Valid @RequestBody UpdateMyProfileRequest request) {
        return ApiResponse.ok(meService.updateMyProfile(request));
    }

    @PutMapping("/preferences")
    public ApiResponse<MyProfileResponse> updateNotificationPreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request
    ) {
        return ApiResponse.ok(meService.updateNotificationPreferences(request));
    }

    @PostMapping(value = "/profile/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<MyProfileResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok(meService.uploadAvatar(file));
    }

    @GetMapping("/billing")
    public ApiResponse<List<MyBillingItemResponse>> getMyBillingItems() {
        return ApiResponse.ok(meService.getMyBillingItems());
    }

    @GetMapping("/notifications")
    public ApiResponse<List<MyNotificationResponse>> getMyNotifications() {
        return ApiResponse.ok(meService.getMyNotifications());
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        meService.changePassword(request);
        return ApiResponse.ok(null);
    }
}
