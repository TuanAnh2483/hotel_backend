# Implementation Summary 2026-04-23

## Scope Closed In This Round

The backend now has a much fuller partner operations scope than before.

Completed areas:
- partner hotel CRUD
- partner room CRUD
- partner room calendar by date range
- partner booking dashboard and booking detail
- partner booking completion
- partner mock refund
- partner analytics summary
- customer/public/partner review flow
- forgot password and reset password backend MVP

## What Was Added

### 1. Partner room calendar

Purpose:
- let partner read daily rate + daily inventory snapshot by room
- let partner patch `price`, `minStay`, `closed`, `availableRooms` by block date range

Main code:
- `src/main/java/com/hotel/hotel_backend/controller/PartnerController.java`
- `src/main/java/com/hotel/hotel_backend/service/PartnerRoomCalendarService.java`
- `docs/http/partner-calendar.http`

### 2. Partner booking operations

Purpose:
- let partner finish eligible stays
- let partner run mock refund on paid bookings
- keep inventory consistent when refunding future confirmed stays

Main code:
- `src/main/java/com/hotel/hotel_backend/controller/PartnerController.java`
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java`
- `docs/http/partner-ops.http`

### 3. Partner analytics summary

Purpose:
- give partner one summary endpoint for booking counts and revenue

Current output:
- total bookings
- pending / confirmed / completed / refunded / cancelled counts
- gross revenue
- refunded amount
- net revenue

Main code:
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java`

### 4. Review management

Purpose:
- customer can review after completed stay
- public can read hotel reviews
- partner can list reviews of owned hotels and reply
- hotel `ratingAvg` and `ratingCount` now come from real review data

Main code:
- `src/main/java/com/hotel/hotel_backend/controller/ReviewController.java`
- `src/main/java/com/hotel/hotel_backend/service/HotelReviewService.java`
- `src/main/java/com/hotel/hotel_backend/repository/HotelReviewRepository.java`
- `docs/http/reviews.http`

### 5. Forgot and reset password

Purpose:
- let user recover account access without admin intervention
- invalidate old JWT sessions after password reset
- keep the flow testable before real email integration exists

Current behavior:
- `POST /api/auth/forgot-password` always returns a generic success message
- if the account exists and is active, backend generates a reset token with TTL
- backend delivers the token through `PasswordResetEmailService`
- `MAIL_ENABLED=false` uses local log delivery (`EMAIL_LOG`), while `MAIL_ENABLED=true` sends through SMTP (`EMAIL`)
- response no longer exposes `resetToken`, so reset now models email verification instead of direct token copy
- `POST /api/auth/reset-password` consumes the token, updates the password, marks the token as used, and increments `tokenVersion`

Main code:
- `src/main/java/com/hotel/hotel_backend/controller/AuthController.java`
- `src/main/java/com/hotel/hotel_backend/service/AuthService.java`
- `src/main/java/com/hotel/hotel_backend/service/PasswordResetEmailService.java`
- `src/main/java/com/hotel/hotel_backend/entity/PasswordResetToken.java`
- `src/main/java/com/hotel/hotel_backend/repository/PasswordResetTokenRepository.java`
- `docs/auth-password-reset-mvp.md`
- `docs/http/auth-password.http`

## Current Status

Reference docs:
- `docs/partner-feature-status.md`
- `docs/thesis-proposal-alignment-matrix.md`

Short status:
- partner operations for MVP backend are now in good shape
- thesis gaps reduced significantly on partner side
- account recovery is now closed at backend MVP level
- current shared gaps are now deeper analytics, AI support, and UI/mobile delivery

## Verification Already Done

Verified by integration tests:
- `AuthFlowIntegrationTest`
- `ReviewIntegrationTest`
- `PartnerBookingIntegrationTest`
- `PartnerRoomCalendarIntegrationTest`
- `HotelDetailIntegrationTest`

This gives coverage for:
- forgot/reset password and JWT invalidation after reset
- partner booking flow
- partner calendar flow
- review creation/list/reply flow
- public hotel detail/available rooms compatibility
