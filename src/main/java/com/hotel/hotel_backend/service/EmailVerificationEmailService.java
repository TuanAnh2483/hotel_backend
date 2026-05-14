package com.hotel.hotel_backend.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.OffsetDateTime;

@Slf4j
@Service
public class EmailVerificationEmailService {

    private final Resend resend;
    private final String frontendVerifyUrl;
    private final boolean mailEnabled;
    private final String mailFrom;

    public EmailVerificationEmailService(
            @Value("${resend.api-key:}") String resendApiKey,
            @Value("${app.email-verification.frontend-verify-url:http://localhost:3000/verify-email}") String frontendVerifyUrl,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:Hotel <onboarding@resend.dev>}") String mailFrom
    ) {
        this.resend = resendApiKey == null || resendApiKey.isBlank()
                ? null
                : new Resend(resendApiKey);

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

        if (resend == null) {
            throw new IllegalStateException("RESEND_API_KEY chưa được cấu hình");
        }

        String textContent = """
                Welcome to Hotel.

                Verify your email by opening this link:
                %s

                This link expires at:
                %s

                If you did not create this account, ignore this email.
                """.formatted(verificationLink, expiresAt);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(mailFrom)
                .to(email)
                .subject("Verify your hotel account email")
                .text(textContent)
                .build();

        try {
            CreateEmailResponse response = resend.emails().send(params);
            log.info("Verification email sent by Resend: to={}, emailId={}", email, response.getId());
        } catch (ResendException ex) {
            log.error("Failed to send verification email via Resend: to={}", email, ex);
            throw new IllegalStateException("Không thể gửi email xác thực qua Resend", ex);
        }

        return new EmailVerificationDelivery(deliveryMode());
    }

    public String deliveryMode() {
        return mailEnabled ? "EMAIL" : "EMAIL_LOG";
    }

    public record EmailVerificationDelivery(String deliveryMode) {
    }
}