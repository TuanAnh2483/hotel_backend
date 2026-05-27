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
public class EmailVerificationEmailService {

    private final JavaMailSender mailSender;
    private final String frontendVerifyUrl;
    private final boolean mailEnabled;
    private final String mailFrom;

    public EmailVerificationEmailService(
            JavaMailSender mailSender,
            @Value("${app.email-verification.frontend-verify-url:http://localhost:5173/verify-email}") String frontendVerifyUrl,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@hotel.local}") String mailFrom
    ) {
        this.mailSender = mailSender;
        this.frontendVerifyUrl = frontendVerifyUrl;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
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

        if (!mailEnabled) {
            log.info(
                    "Mock email verification queued: to={}, expiresAt={}, verificationLink={}",
                    email,
                    expiresAt,
                    verificationLink
            );
            return new EmailVerificationDelivery(deliveryMode());
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Verify your hotel account email");
        message.setText("""
                Welcome to Hotel.

                Verify your email by opening this link:
                %s

                This link expires at:
                %s

                If you did not create this account, ignore this email.
                """.formatted(verificationLink, expiresAt));

        mailSender.send(message);
        log.info("Verification email sent via SMTP: to={}", email);
        return new EmailVerificationDelivery(deliveryMode());
    }

    public String deliveryMode() {
        return mailEnabled ? "EMAIL" : "EMAIL_LOG";
    }

    public record EmailVerificationDelivery(String deliveryMode) {
    }
}