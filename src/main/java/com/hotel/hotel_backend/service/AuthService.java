package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.ForgotPasswordRequest;
import com.hotel.hotel_backend.dto.request.LoginRequest;
import com.hotel.hotel_backend.dto.request.RegisterRequest;
import com.hotel.hotel_backend.dto.request.ResendVerificationRequest;
import com.hotel.hotel_backend.dto.request.ResetPasswordRequest;
import com.hotel.hotel_backend.dto.request.VerifyEmailRequest;
import com.hotel.hotel_backend.dto.response.AuthResponse;
import com.hotel.hotel_backend.dto.response.ForgotPasswordResponse;
import com.hotel.hotel_backend.dto.response.RegisterResponse;
import com.hotel.hotel_backend.dto.response.ResendVerificationResponse;
import com.hotel.hotel_backend.dto.response.ResetPasswordResponse;
import com.hotel.hotel_backend.dto.response.VerifyEmailResponse;
import com.hotel.hotel_backend.entity.EmailVerificationToken;
import com.hotel.hotel_backend.entity.PasswordResetToken;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.BadRequestException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.EmailVerificationTokenRepository;
import com.hotel.hotel_backend.repository.PasswordResetTokenRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

@Service
public class AuthService {

    private static final long PASSWORD_RESET_TTL_MINUTES = 30;
    private static final long EMAIL_VERIFICATION_TTL_HOURS = 24;
    private static final String PASSWORD_RESET_MESSAGE =
            "If the account exists, a password reset token has been generated";
    private static final String REGISTER_MESSAGE =
            "Registration successful. Please verify your email before logging in";
    private static final String RESEND_VERIFICATION_MESSAGE =
            "If the account exists and the email is not verified, a verification email has been queued";

    private final UserRepository userRepo;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityService securityService;
    private final PasswordResetEmailService passwordResetEmailService;
    private final EmailVerificationEmailService emailVerificationEmailService;
    private final boolean exposeDebugTokens;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepo,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SecurityService securityService,
            PasswordResetEmailService passwordResetEmailService,
            EmailVerificationEmailService emailVerificationEmailService,
            @Value("${app.mail.expose-debug-tokens:false}") boolean exposeDebugTokens
    ) {
        this.userRepo = userRepo;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityService = securityService;
        this.passwordResetEmailService = passwordResetEmailService;
        this.emailVerificationEmailService = emailVerificationEmailService;
        this.exposeDebugTokens = exposeDebugTokens;
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
                        user.getStatus().name(),
                        user.isEmailVerified(),
                        user.getEmailVerifiedAt()
                )
        );
    }

    @Transactional
    public RegisterResponse register(@Valid RegisterRequest req) {
        return registerWithRole(req, UserType.CUSTOMER);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest log) {
        String email = normalizeEmail(log.email());
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(log.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS,"sai email hoặc password");
        }

        // Account lock/disable is orthogonal to email verification, so enforce both before JWT issue.
        assertActive(user);
        assertEmailVerified(user);

        String token = jwtService.generate(user);
        return buildAuthResponse(user, token);
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(@Valid ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return new ForgotPasswordResponse(PASSWORD_RESET_MESSAGE, passwordResetEmailService.deliveryMode(), null, null);
        }

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
                exposeDebugTokens ? savedToken.getToken() : null,
                exposeDebugTokens ? savedToken.getExpiresAt() : null
        );
    }

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
    public VerifyEmailResponse verifyEmail(@Valid VerifyEmailRequest request) {
        // Raw verification tokens are only accepted from the client; the database stores their hash.
        EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(hashToken(request.token()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Email verification token not found"));

        User user = token.getUser();
        if (user.isEmailVerified()) {
            return new VerifyEmailResponse("Email is already verified", user.getEmailVerifiedAt());
        }
        if (token.getUsedAt() != null) {
            return new VerifyEmailResponse("Email is already verified", token.getUsedAt());
        }
        if (token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ApiException(ErrorCode.CONFLICT, "Email verification token expired");
        }

        OffsetDateTime verifiedAt = OffsetDateTime.now();
        user.setEmailVerifiedAt(verifiedAt);
        token.setUsedAt(verifiedAt);

        userRepo.save(user);
        emailVerificationTokenRepository.save(token);

        return new VerifyEmailResponse("Email has been verified successfully", verifiedAt);
    }

    @Transactional
    public ResendVerificationResponse resendVerification(@Valid ResendVerificationRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepo.findByEmail(email).orElse(null);

        // Keep the same public response for unknown and already-verified accounts.
        if (user == null || user.isEmailVerified() || !canIssueVerification(user)) {
            return new ResendVerificationResponse(
                    RESEND_VERIFICATION_MESSAGE,
                    emailVerificationEmailService.deliveryMode(),
                    null,
                    null
            );
        }

        EmailVerificationDispatch dispatch = issueEmailVerification(user);
        return new ResendVerificationResponse(
                RESEND_VERIFICATION_MESSAGE,
                dispatch.deliveryMode(),
                dispatch.debugToken(),
                dispatch.expiresAt()
        );
    }

    @Transactional
    public void logout() {
        User currentUser = securityService.getCurrentUser();
        currentUser.setTokenVersion(currentUser.getTokenVersion() + 1);
    }

    private RegisterResponse registerWithRole(RegisterRequest req, UserType role) {
        String email = normalizeEmail(req.email());

        if (!Objects.equals(req.password(), req.confirmPassword())) {
            throw new BadRequestException("Not confirm password", ErrorCode.VALIDATION_ERROR);
        }

        // Re-registering an unverified account rotates its verification link without changing ownership.
        User existingUser = userRepo.findByEmail(email).orElse(null);
        if (existingUser != null) {
            if (existingUser.isEmailVerified()
                    || !canIssueVerification(existingUser)
                    || existingUser.getUserType() != role) {
                throw new ApiException(ErrorCode.EMAIL_EXISTS);
            }

            return buildRegisterResponse(issueEmailVerification(existingUser));
        }

        User user = createUser(email, req.password(), role);
        return buildRegisterResponse(issueEmailVerification(user));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private User createUser(String email, String rawPassword, UserType role) {
        User user = new User();
        user.setEmail(email);
        user.setUserType(role);
        // Activation is tracked by status; email verification is tracked separately via emailVerifiedAt.
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepo.save(user);
    }

    private void assertActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.ACCOUNT_INACTIVE);
        }
    }

    private void assertEmailVerified(User user) {
        if (!user.isEmailVerified()) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED, "Please verify your email before logging in");
        }
    }

    private EmailVerificationDispatch issueEmailVerification(User user) {
        // Only the most recent verification link should remain valid for a given account.
        emailVerificationTokenRepository.deleteByUserId(user.getId());

        String rawToken = generateOpaqueToken();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(OffsetDateTime.now().plusHours(EMAIL_VERIFICATION_TTL_HOURS));

        EmailVerificationToken savedToken = emailVerificationTokenRepository.save(token);
        EmailVerificationEmailService.EmailVerificationDelivery delivery =
                emailVerificationEmailService.sendVerificationEmail(
                        savedToken.getUser().getEmail(),
                        rawToken,
                        savedToken.getExpiresAt()
                );

        return new EmailVerificationDispatch(
                delivery.deliveryMode(),
                exposeDebugTokens ? rawToken : null,
                exposeDebugTokens ? savedToken.getExpiresAt() : null
        );
    }

    private boolean canIssueVerification(User user) {
        return user.getStatus() == UserStatus.ACTIVE;
    }

    private RegisterResponse buildRegisterResponse(EmailVerificationDispatch dispatch) {
        return new RegisterResponse(
                REGISTER_MESSAGE,
                dispatch.deliveryMode(),
                dispatch.debugToken(),
                dispatch.expiresAt()
        );
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            // Persisting only the hash prevents raw verification tokens from being recoverable from the DB.
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private record EmailVerificationDispatch(
            String deliveryMode,
            String debugToken,
            OffsetDateTime expiresAt
    ) {
    }
}
