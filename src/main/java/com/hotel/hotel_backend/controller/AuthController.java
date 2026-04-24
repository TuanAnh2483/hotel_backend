package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.ForgotPasswordRequest;
import com.hotel.hotel_backend.dto.request.LoginRequest;
import com.hotel.hotel_backend.dto.request.ResendVerificationRequest;
import com.hotel.hotel_backend.dto.request.ResetPasswordRequest;
import com.hotel.hotel_backend.dto.request.RegisterRequest;
import com.hotel.hotel_backend.dto.request.VerifyEmailRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.AuthResponse;
import com.hotel.hotel_backend.dto.response.ForgotPasswordResponse;
import com.hotel.hotel_backend.dto.response.RegisterResponse;
import com.hotel.hotel_backend.dto.response.ResendVerificationResponse;
import com.hotel.hotel_backend.dto.response.ResetPasswordResponse;
import com.hotel.hotel_backend.dto.response.VerifyEmailResponse;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    // Registration queues email verification instead of issuing an access token.
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@RequestBody @Valid RegisterRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.register(req)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody @Valid LoginRequest log ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(log)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
            @RequestBody @Valid ForgotPasswordRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.forgotPassword(request)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<ResetPasswordResponse>> resetPassword(
            @RequestBody @Valid ResetPasswordRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.resetPassword(request)));
    }

    @PostMapping("/verify-email")
    // Public endpoint: the client sends only the opaque token copied from the email link.
    public ResponseEntity<ApiResponse<VerifyEmailResponse>> verifyEmail(
            @RequestBody @Valid VerifyEmailRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.verifyEmail(request)));
    }

    @PostMapping("/resend-verification")
    // Response stays generic so callers cannot probe which emails exist in the system.
    public ResponseEntity<ApiResponse<ResendVerificationResponse>> resendVerification(
            @RequestBody @Valid ResendVerificationRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(authService.resendVerification(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        authService.logout();
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/register-partner")
    public ResponseEntity<ApiResponse<Void>> registerPartner() {
        throw new ApiException(
                ErrorCode.FORBIDDEN,
                "Partner self-registration is disabled. Please use the onboarding flow."
        );
    }
}
