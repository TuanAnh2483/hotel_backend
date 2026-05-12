package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_POST_ENDPOINTS = Set.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/register-partner",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification"
    );

    private static final Set<String> PUBLIC_GET_ENDPOINTS = Set.of(
            "/auth-demo.html",
            "/api/health",
            "/api/hotels/search"
    );

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RestAuthEntryPoint restAuthEntryPoint;

    public JwtAuthFilter(
            JwtService jwtService,
            UserRepository userRepository,
            RestAuthEntryPoint restAuthEntryPoint
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.restAuthEntryPoint = restAuthEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (isPublicEndpoint(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);

        if (token.isBlank()) {
            restAuthEntryPoint.commence(request, response, new BadCredentialsException("Token is missing"));
            return;
        }

        try {
            AccessTokenClaims claims = jwtService.parse(token);
            User user = userRepository.findById(claims.userId())
                    .orElseThrow(() -> new BadCredentialsException("User not found"));

            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new BadCredentialsException("User is inactive");
            }

            if (user.getTokenVersion() != claims.tokenVersion()) {
                throw new BadCredentialsException("Token has been revoked");
            }

            JwtPrincipal p = new JwtPrincipal(user.getId(), user.getEmail(), user.getUserType());

            var authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + user.getUserType().name())
            );

            var auth = new UsernamePasswordAuthenticationToken(
                    p,
                    null,
                    authorities
            );

            SecurityContextHolder.getContext().setAuthentication(auth);

            filterChain.doFilter(request, response);

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            restAuthEntryPoint.commence(request, response, new BadCredentialsException("Invalid JWT", ex));
        }
    }

    private boolean isPublicEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            return PUBLIC_POST_ENDPOINTS.contains(path);
        }
        if ("GET".equalsIgnoreCase(method)) {
            if (PUBLIC_GET_ENDPOINTS.contains(path)) {
                return true;
            }

            return path.matches("^/api/hotels/[^/]+$") || path.matches("^/api/hotels/[^/]+/(reviews|available-rooms)$");
        }

        return false;
    }
}
