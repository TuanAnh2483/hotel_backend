package com.hotel.hotel_backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class PasswordResetEmailService {

    private final AppEmailSender emailSender;
    private final String frontendResetUrl;

    public PasswordResetEmailService(
            AppEmailSender emailSender,
            @Value("${app.password-reset.frontend-reset-url:http://localhost:3000/reset-password}") String frontendResetUrl
    ) {
        this.emailSender = emailSender;
        this.frontendResetUrl = frontendResetUrl;
    }

    public PasswordResetDelivery sendPasswordResetEmail(String email, String token, OffsetDateTime expiresAt) {
        String resetLink = UriComponentsBuilder.fromUriString(frontendResetUrl)
                .queryParam("token", token)
                .build()
                .toUriString();

        String deliveryMode = emailSender.send(
                email,
                "Reset your hotel account password",
                """
                You requested to reset your password.

                Reset link:
                %s

                This link expires at:
                %s

                If you did not request this, ignore this email.
                """.formatted(resetLink, expiresAt)
        );

        return new PasswordResetDelivery(deliveryMode);
    }

    public String deliveryMode() {
        return emailSender.deliveryMode();
    }

    public record PasswordResetDelivery(String deliveryMode) {
    }
}
