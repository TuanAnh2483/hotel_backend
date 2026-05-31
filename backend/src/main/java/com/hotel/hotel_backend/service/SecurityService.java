package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final UserRepository userRepository;

    public JwtPrincipal getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof JwtPrincipal jwtPrincipal)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }

        return jwtPrincipal;
    }

    public User getCurrentUser() {
        JwtPrincipal principal = getCurrentPrincipal();
        return userRepository.findById(principal.userId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}
