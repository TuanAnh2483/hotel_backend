# Auth Password Reset MVP

## Scope

This project now supports backend password recovery with an email-verification-style flow.

Current endpoints:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Current Behavior

### Forgot password

Request:
- client sends email

Behavior:
- if user exists and is active, backend creates a reset token
- previous reset tokens for that user are removed
- backend sends the token through `PasswordResetEmailService`
- response does not return the token directly in normal mode

Important note:
- when `MAIL_ENABLED=false`, delivery is mocked by logging the reset link and response uses `EMAIL_LOG`
- when `MAIL_ENABLED=true`, backend sends the reset link through SMTP and response uses `EMAIL`
- when `MAIL_EXPOSE_DEBUG_TOKENS=true`, the response also includes `resetToken` and `expiresAt` for local testing
- SMTP credentials must be supplied through environment variables, not source code

### Reset password

Request:
- client sends `token`, `newPassword`, `confirmPassword`

Behavior:
- token must exist
- token must not be used
- token must not be expired
- password is updated
- token is marked as used
- `tokenVersion` is incremented so old JWT sessions become invalid

## Main Code

- `src/main/java/com/hotel/hotel_backend/controller/AuthController.java`
- `src/main/java/com/hotel/hotel_backend/service/AuthService.java`
- `src/main/java/com/hotel/hotel_backend/service/PasswordResetEmailService.java`
- `src/main/java/com/hotel/hotel_backend/entity/PasswordResetToken.java`
- `src/main/java/com/hotel/hotel_backend/repository/PasswordResetTokenRepository.java`
- `src/main/resources/application.yaml`
- `docs/http/auth-password.http`

## Verification

Covered by:
- `src/test/java/com/hotel/hotel_backend/controller/AuthFlowIntegrationTest.java`

Verified scenarios:
- forgot password does not expose reset token in API response
- reset token is generated for the active account and delivered through the configured email service
- reset password accepts valid token
- old password no longer works
- new password works
- old JWT becomes invalid after reset
- reused token is rejected
- unknown email returns the same generic success shape without creating a token

## Manual Test

Reference file:
- `docs/http/auth-password.http`

Quick flow:
1. register or use an existing active account
2. call `POST /api/auth/forgot-password`
3. if `MAIL_ENABLED=false` and `MAIL_EXPOSE_DEBUG_TOKENS=false`, copy the reset token from the application log line emitted by `PasswordResetEmailService`
4. if `MAIL_EXPOSE_DEBUG_TOKENS=true`, copy the reset token directly from the API response or use the frontend debug button
5. if `MAIL_ENABLED=true`, copy the reset token from the email link
6. call `POST /api/auth/reset-password` with the token and new password
7. verify old password fails and new password succeeds

## SMTP Environment Example

```powershell
$env:MAIL_ENABLED="true"
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="your-email@gmail.com"
$env:MAIL_PASSWORD="your-gmail-app-password"
$env:MAIL_FROM="your-email@gmail.com"
$env:PASSWORD_RESET_FRONTEND_URL="http://localhost:3000/reset-password"
```
