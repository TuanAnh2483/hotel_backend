package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.ForgotPasswordRequest;
import com.hotel.hotel_backend.dto.request.LoginRequest;
import com.hotel.hotel_backend.dto.request.ResetPasswordRequest;
import com.hotel.hotel_backend.dto.request.RegisterRequest;
import com.hotel.hotel_backend.dto.response.AuthResponse;
import com.hotel.hotel_backend.dto.response.ForgotPasswordResponse;
import com.hotel.hotel_backend.dto.response.ResetPasswordResponse;
import com.hotel.hotel_backend.entity.PasswordResetToken;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.BadRequestException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.PasswordResetTokenRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private static final long PASSWORD_RESET_TTL_MINUTES = 30;
    private static final String PASSWORD_RESET_MESSAGE =
            "If the account exists, a password reset token has been generated";

    private final UserRepository userRepo;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityService securityService;
    private final PasswordResetEmailService passwordResetEmailService;


    public AuthService(
            UserRepository userRepo,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SecurityService securityService,
            PasswordResetEmailService passwordResetEmailService
    ) {
        this.userRepo = userRepo;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityService = securityService;
        this.passwordResetEmailService = passwordResetEmailService;
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpSeconds(),
                new AuthResponse.UserView(
                        user.getId(),
                        user.getEmail(),
                        user.getUserType().name(),
                        user.getStatus().name()
                )
        );
    }

    @Transactional
    public AuthResponse register(@Valid RegisterRequest req){
        // Đăng ký tài khoản khách hàng và trả JWT.

        return  registerWithRole(req, UserType.CUSTOMER);

    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest log) {
        // Xác thực đăng nhập và trả JWT.
        String email = normalizeEmail(log.email());
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(log.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }

        assertActive(user);

        String token = jwtService.generate(user);
        return buildAuthResponse(user, token);
    }

    /**
     * User quen mat khau thi token phai di qua email de xac minh chu tai khoan, API khong tra token truc tiep?
     */
    @Transactional
    public ForgotPasswordResponse forgotPassword(@Valid ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return new ForgotPasswordResponse(PASSWORD_RESET_MESSAGE, passwordResetEmailService.deliveryMode(), null, null);
        }

        // Tai sao xoa token cu? Moi user chi nen co mot reset link moi nhat con hieu luc.
        passwordResetTokenRepository.deleteByUserId(user.getId());

        PasswordResetToken passwordResetToken = new PasswordResetToken();
        passwordResetToken.setUser(user);
        passwordResetToken.setToken(UUID.randomUUID().toString());
        passwordResetToken.setExpiresAt(OffsetDateTime.now().plusMinutes(PASSWORD_RESET_TTL_MINUTES));

        PasswordResetToken savedToken = passwordResetTokenRepository.save(passwordResetToken);
        PasswordResetEmailService.PasswordResetDelivery delivery = passwordResetEmailService.sendPasswordResetEmail(
                savedToken.getUser().getEmail(),
                savedToken.getToken(),
                savedToken.getExpiresAt()
        );

        return new ForgotPasswordResponse(
                PASSWORD_RESET_MESSAGE,
                delivery.deliveryMode(),
                null,
                null
        );
    }

    /**
     * User co reset token hop le thi doi mat khau, invalidate token cu va token JWT dang ton tai ra sao?
     */
    @Transactional
    public ResetPasswordResponse resetPassword(@Valid ResetPasswordRequest request) {
        PasswordResetToken passwordResetToken = passwordResetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Reset token not found"));

        if (passwordResetToken.getUsedAt() != null) {
            throw new ApiException(ErrorCode.CONFLICT, "Reset token already used");
        }
        if (passwordResetToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ApiException(ErrorCode.CONFLICT, "Reset token expired");
        }

        User user = passwordResetToken.getUser();
        assertActive(user);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        passwordResetToken.setUsedAt(OffsetDateTime.now());

        passwordResetTokenRepository.save(passwordResetToken);
        userRepo.save(user);

        return new ResetPasswordResponse("Password has been reset successfully");
    }

    @Transactional
    public void logout() {
        User currentUser = securityService.getCurrentUser();
        currentUser.setTokenVersion(currentUser.getTokenVersion() + 1);
    }


    private AuthResponse registerWithRole(RegisterRequest req, UserType role)  {
        String email = normalizeEmail(req.email());

        if (userRepo.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS);
        }
        String confirmPassWord = passwordEncoder.encode(req.password());
        if (confirmPassWord == null||!req.password().equals(req.confirmPassword()))
         { throw new BadRequestException("Not confirm password", ErrorCode.VALIDATION_ERROR);
        }

        User user = createUser(email, req.password(), role);
        String token = jwtService.generate(user);

        return buildAuthResponse(user, token);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private User createUser(String email, String rawPassword, UserType role) {
        User user = new User();
        user.setEmail(email);
        user.setUserType(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepo.save(user);
    }
    private void assertActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.ACCOUNT_INACTIVE);
        }
    }

}
