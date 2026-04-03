package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.LoginRequest;
import com.hotel.hotel_backend.dto.request.RegisterRequest;
import com.hotel.hotel_backend.dto.response.AuthResponse;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.BadRequestException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.security.JwtService;
import jakarta.validation.Valid;
import lombok.SneakyThrows;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityService securityService;


    public AuthService(
            UserRepository userRepo,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SecurityService securityService
    ) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityService = securityService;
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
