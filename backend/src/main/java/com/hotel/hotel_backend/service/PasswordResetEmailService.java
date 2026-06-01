package com.hotel.hotel_backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class PasswordResetEmailService {

    private final JavaMailSender mailSender;
    private final String frontendResetUrl;
    private final boolean mailEnabled;
    private final String mailFrom;

    public PasswordResetEmailService(
            JavaMailSender mailSender,
            @Value("${app.password-reset.frontend-reset-url:http://localhost:3000/reset-password}") String frontendResetUrl,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@hotel.local}") String mailFrom
    ) {
        this.mailSender = mailSender;
        this.frontendResetUrl = frontendResetUrl;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
    }

    /**
     * Reset link nen duoc gui qua SMTP that hay chi log ra console de test local?
     */
    public PasswordResetDelivery sendPasswordResetEmail(String email, String token, OffsetDateTime expiresAt) {
        String resetLink = UriComponentsBuilder.fromUriString(frontendResetUrl)
                .queryParam("token", token)
                .build()
                .toUriString();

        if (!mailEnabled) {
            log.info(
                    "Mock password reset email queued: to={}, expiresAt={}, resetLink={}",
                    email,
                    expiresAt,
                    resetLink
            );
            return new PasswordResetDelivery(deliveryMode());
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Reset your hotel account password");
        message.setText("""
                You requested to reset your password.

                Reset link:
                %s

                This link expires at:
                %s

                If you did not request this, ignore this email.
                """.formatted(resetLink, expiresAt));

        mailSender.send(message);
        return new PasswordResetDelivery(deliveryMode());
    }

    public String deliveryMode() {
        return mailEnabled ? "EMAIL" : "EMAIL_LOG";
    }

    public record PasswordResetDelivery(String deliveryMode) {
    }
}
