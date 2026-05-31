package com.hotel.hotel_backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class EmailVerificationEmailService {

    private final AppEmailSender emailSender;
    private final String frontendVerifyUrl;
    private final boolean exposeDebugTokens;

    public EmailVerificationEmailService(
            AppEmailSender emailSender,
            @Value("${app.email-verification.frontend-verify-url:http://localhost:5173/verify-email}") String frontendVerifyUrl,
            @Value("${app.mail.expose-debug-tokens:false}") boolean exposeDebugTokens
    ) {
        this.emailSender = emailSender;
        this.frontendVerifyUrl = frontendVerifyUrl;
        this.exposeDebugTokens = exposeDebugTokens;
    }

    public EmailVerificationDelivery sendVerificationEmail(
            String email,
            String token,
            OffsetDateTime expiresAt
    ) {
        String verificationLink = UriComponentsBuilder.fromUriString(frontendVerifyUrl)
                .queryParam("token", token)
                .build()
                .toUriString();

        log.info("Sending verification email: to={}, expiresAt={}{}", email, expiresAt,
                exposeDebugTokens ? ", link=" + verificationLink : "");

        String deliveryMode = emailSender.send(
                email,
                "Verify your hotel account email",
                """
                Welcome to Hotel.

                Verify your email by opening this link:
                %s

                This link expires at:
                %s

                If you did not create this account, ignore this email.
                """.formatted(verificationLink, expiresAt)
        );

        return new EmailVerificationDelivery(deliveryMode);
    }

    public String deliveryMode() {
        return emailSender.deliveryMode();
    }

    public record EmailVerificationDelivery(String deliveryMode) {
    }
}
