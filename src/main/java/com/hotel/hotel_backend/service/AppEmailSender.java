package com.hotel.hotel_backend.service;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Unified email sender that routes through Resend (HTTP) when an API key is
 * configured, falls back to SMTP otherwise.
 *
 * Render.com blocks outbound SMTP connections, so the Resend path is required
 * in production.  Set RESEND_API_KEY and APP_MAIL_FROM env vars on Render.
 */
@Slf4j
@Service
public class AppEmailSender {

    private final JavaMailSender smtpSender;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String resendApiKey;
    private final String resendFrom;

    public AppEmailSender(
            JavaMailSender smtpSender,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@hotel.local}") String mailFrom,
            @Value("${app.resend.api-key:}") String resendApiKey,
            @Value("${app.app.mail.from:Hotel <onboarding@resend.dev>}") String resendFrom
    ) {
        this.smtpSender = smtpSender;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.resendApiKey = resendApiKey;
        this.resendFrom = resendFrom;
    }

    /**
     * Returns the delivery mode that would be used without actually sending.
     * Used for early-return responses where no email is dispatched.
     */
    public String deliveryMode() {
        if (!mailEnabled) return "EMAIL_LOG";
        if (resendApiKey != null && !resendApiKey.isBlank()) return "EMAIL_RESEND";
        return "EMAIL_SMTP";
    }

    /**
     * Send a plain-text email.
     *
     * @return delivery mode string for response payload
     */
    public String send(String to, String subject, String body) {
        if (!mailEnabled) {
            log.info("Mail disabled – skipping send: to={}, subject={}", to, subject);
            return "EMAIL_LOG";
        }

        if (resendApiKey != null && !resendApiKey.isBlank()) {
            sendViaResend(to, subject, body);
            return "EMAIL_RESEND";
        }

        sendViaSmtp(to, subject, body);
        return "EMAIL_SMTP";
    }

    private void sendViaResend(String to, String subject, String body) {
        try {
            Resend resend = new Resend(resendApiKey);
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(resendFrom)
                    .to(to)
                    .subject(subject)
                    .text(body)
                    .build();
            resend.emails().send(params);
            log.info("Email sent via Resend: to={}", to);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email via Resend: " + e.getMessage(), e);
        }
    }

    private void sendViaSmtp(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        smtpSender.send(message);
        log.info("Email sent via SMTP: to={}", to);
    }
}
