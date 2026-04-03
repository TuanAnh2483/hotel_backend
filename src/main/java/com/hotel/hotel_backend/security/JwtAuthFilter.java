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
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

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
}
