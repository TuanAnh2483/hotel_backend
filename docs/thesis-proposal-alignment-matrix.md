# Thesis Proposal Alignment Matrix

Updated: 2026-04-23

## Context

Source proposal:
- `C:\Users\tuana\Downloads\CNTT.DAKLTN.1a. Đề cương đồ án tốt nghiệp (3).docx`

Evaluation scope:
- This review is based on the current backend repository only.
- The repository is a Spring Boot backend module, not a full product bundle with Web, Mobile, and AI UI.
- Evidence is taken from runtime code, docs, and integration tests currently present in this repo.

Status legend:
- `Done`: implemented and visible in runtime/backend contract.
- `Partial`: implemented in part, or code/data exists but not yet exposed as a complete feature.
- `Missing`: not found as a complete backend feature in the current repo.
- `Mismatch`: feature exists, but current runtime behavior differs from the wording in the proposal.

## Executive Summary

Current backend already matches the core direction of the thesis well in these areas:
- JWT auth and role-based access
- public hotel search and hotel detail
- booking quote, create booking, mock payment, cancel
- partner onboarding and admin approval
- partner hotel and room management
- partner booking list/detail
- daily inventory and daily pricing used internally for availability and stay pricing

Current backend does not yet fully match the thesis in these important areas:
- AI demand forecasting and pricing recommendation
- Web/Mobile frontend deliverables

Most important narrative mismatch with the proposal:
- The proposal describes inventory deduction as happening after payment success.
- The current backend reserves inventory when booking is created in `PENDING_PAYMENT`, then payment only confirms the booking.
- Runtime evidence:
  - `src/main/java/com/hotel/hotel_backend/service/impl/BookingServiceImpl.java:68`
  - `src/main/java/com/hotel/hotel_backend/service/impl/BookingServiceImpl.java:83`
  - `docs/payment-feature-spec.md:104`

## Alignment Matrix

| Proposal Function Group | Status | Current Backend Reality | Evidence | Gap / Note |
| --- | --- | --- | --- | --- |
| 1. Account management | `Done` | Register, login, logout, current-user info, role guard, forgot password, and reset password are present. | `AuthController.java:24`, `AuthController.java:29`, `AuthController.java:34`, `AuthController.java:39`, `AuthController.java:47`, `MeController.java:19`, `SecurityConfig.java:67`, `AuthFlowIntegrationTest.java:102` | Password reset now verifies through an email-style token flow, but delivery is still mock email/log instead of real SMTP/provider. |
| 2. Search and hotel information | `Done` | Public user can search hotels, filter stay dates, open hotel detail, and check available rooms. Catalog/filter options are exposed. | `HotelController.java:36`, `HotelController.java:57`, `HotelController.java:63`, `CatalogController.java:21`, `HotelCandidateQueryService.java:20` | Strong backend coverage for MVP search. |
| 3. Booking management | `Done` | Quote, create booking, list my bookings, booking detail, cancel booking are implemented. | `BookingController.java:35`, `BookingController.java:41`, `BookingController.java:48`, `BookingController.java:54`, `BookingController.java:78` | Cancel policy should be documented more clearly for thesis wording because runtime is broader than "only unpaid/expired". |
| 4. Payment management | `Partial` | Mock payment, payment transaction timeline, booking state update, payment idempotency, expiration handling, and simulated refund are implemented. | `BookingController.java:61`, `BookingController.java:69`, `BookingServiceImpl.java:127`, `PartnerController.java:90`, `PartnerBookingService.java:91`, `docs/payment-feature-spec.md:102` | External payment gateway and real refund provider integration are still not implemented. |
| 5. Review management | `Done` | Customer can create/update/delete review after completed stay, public can read hotel reviews, and partner can list/reply to reviews of owned hotels. | `ReviewController.java:24`, `HotelController.java:75`, `PartnerController.java:67`, `PartnerController.java:109`, `HotelReviewService.java:39`, `ReviewIntegrationTest.java:95` | Review lifecycle is now covered for MVP scope. |
| 6. Partner hotel management | `Done` | Partner can list/create/update/delete hotels after onboarding and admin approval. | `PartnerOnboardingController.java:30`, `PartnerOnboardingController.java:56`, `AdminController.java:25`, `AdminController.java:36`, `PartnerController.java:29`, `PartnerController.java:47`, `PartnerController.java:54`, `PartnerController.java:62` | This area is already solid for MVP backend. |
| 7. Room type management | `Done` | Partner can create/list/update/delete rooms. | `PartnerController.java:69`, `PartnerController.java:77`, `PartnerController.java:84`, `PartnerController.java:92` | Naming in code is `Room`, not a separate `RoomType` aggregate. Acceptable for MVP if report explains mapping. |
| 8. Daily pricing and inventory calendar | `Done` | `DailyRate` and `DailyInventory` exist, are used in search/booking/inventory services, and now have partner-facing calendar read/upsert APIs by date range. | `DailyRate.java`, `DailyInventory.java`, `HotelAvailabilityService.java:345`, `HotelAvailabilityService.java:356`, `InventoryServiceImpl.java:45`, `InventoryServiceImpl.java:107`, `PartnerController.java:107`, `PartnerController.java:121`, `PartnerRoomCalendarService.java:42`, `PartnerRoomCalendarService.java:63`, `PartnerRoomCalendarIntegrationTest.java:102`, `PartnerRoomCalendarIntegrationTest.java:131` | Backend thesis gap for calendar management is now closed for MVP scope. |
| 9. Booking and revenue analytics | `Done` | Partner can view booking list/detail with filters and read revenue analytics summary by hotel/check-in range. | `PartnerController.java:53`, `PartnerController.java:74`, `PartnerBookingService.java:41`, `PartnerBookingService.java:126`, `BookingRepository.java:25`, `BookingRepository.java:76` | Admin-wide analytics is still future scope, but partner-facing thesis scope is now covered. |
| 10. AI demand forecasting | `Missing` | No forecast controller/service/dto/module found in repo. | No runtime module found under `controller`, `service`, `dto`, or `entity` for forecast/insight | This is one of the biggest gaps versus the thesis proposal. |

## Cross-Cutting Alignment

### A. Roles and access control

Status: `Done`

What matches:
- Public user can access search/detail/catalog routes.
- Customer-only booking and payment routes are protected.
- Partner-only management routes are protected.
- Admin-only partner approval routes are protected.

Evidence:
- `src/main/java/com/hotel/hotel_backend/security/SecurityConfig.java:67`
- `src/main/java/com/hotel/hotel_backend/security/JwtAuthFilter.java:77`

### B. Partner onboarding model

Status: `Done`

What matches:
- The proposal expects partner-side management to be controlled by role.
- Current backend uses a safer onboarding + admin approval flow before partner permissions are granted.

Evidence:
- `src/main/java/com/hotel/hotel_backend/controller/PartnerOnboardingController.java:30`
- `src/main/java/com/hotel/hotel_backend/controller/AdminController.java:36`

Assessment:
- This is stronger than the proposal in terms of governance and should be kept.

### C. Daily inventory consistency

Status: `Done`

What matches:
- Daily inventory is a real domain concept.
- Availability checks and room reservation/release are based on date ranges.

Evidence:
- `src/main/java/com/hotel/hotel_backend/service/impl/InventoryServiceImpl.java:88`
- `src/main/java/com/hotel/hotel_backend/service/impl/InventoryServiceImpl.java:107`
- `src/main/java/com/hotel/hotel_backend/service/impl/InventoryServiceImpl.java:129`

Assessment:
- This is one of the strongest technical pillars of the current system.

### D. Booking lifecycle

Status: `Done`

What matches:
- `PENDING_PAYMENT`
- `CONFIRMED`
- `CANCELLED`

Evidence:
- `src/main/java/com/hotel/hotel_backend/entity/BookingStatus.java:3`
- `src/main/java/com/hotel/hotel_backend/service/BookingExpirationJob.java:15`
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java:77`
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java:91`

Assessment:
- Runtime now covers `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, and `REFUNDED` in the main marketplace flow.

### E. Admin scope

Status: `Partial`

What matches:
- Admin reviews partner applications.

What is missing:
- Admin management for full user set
- Admin-wide hotel governance APIs
- Admin-wide booking monitoring
- Admin refund operations

Evidence:
- `src/main/java/com/hotel/hotel_backend/controller/AdminController.java:25`

## Key Mismatches With Proposal Wording

### 1. Inventory reservation timing

Status: `Mismatch`

Proposal wording:
- after successful payment, the system deducts inventory

Current runtime:
- inventory is reserved when booking is created in `PENDING_PAYMENT`
- if booking expires or is canceled, inventory is released
- payment success does not reserve inventory again

Evidence:
- `src/main/java/com/hotel/hotel_backend/service/impl/BookingServiceImpl.java:68`
- `src/main/java/com/hotel/hotel_backend/service/impl/BookingServiceImpl.java:83`
- `docs/payment-feature-spec.md:104`

Recommendation:
- Either update thesis wording to match runtime
- or refactor backend flow later if you want payment-success reservation semantics

Current recommendation:
- update the thesis wording, because the current design is coherent and already tested

### 2. Product deliverables vs current repository

Status: `Mismatch`

Proposal wording:
- backend + Web + Mobile + AI insight module

Current repository:
- backend-only Maven project
- no Web frontend source
- no Mobile frontend source

Evidence:
- `pom.xml:11`
- no `package.json`, no frontend module in repo root

Recommendation:
- clearly state that current repo covers backend MVP core
- separate frontend/mobile work into another repo or deliverable section

## What Is Already Strong Enough To Defend

- The system is no longer just a rough skeleton; it has a real business flow and integration tests.
- Search, pricing, availability, booking, payment placeholder, and partner management already form a coherent marketplace backend.
- Partner onboarding and admin approval improve governance and make the project more realistic.
- The daily inventory model is implemented at a meaningful technical depth, not just described in theory.

These are the best parts to emphasize in the thesis defense:
- consistency of booking and inventory
- role-based marketplace architecture
- API-first backend design
- clear booking lifecycle around `PENDING_PAYMENT` and `CONFIRMED`

## Priority Improvements To Reach The Thesis Goal

### Priority 1: close the biggest thesis gaps

1. admin-wide hotel/booking monitoring

Why:
- These are common thesis checklist items and reduce the gap between document and runtime.

### Priority 3: add thesis differentiator

1. heuristic demand forecasting
2. price recommendation module

Suggested MVP scope:
- occupancy estimate by day
- demand level `HIGH / MEDIUM / LOW`
- suggested price adjustment percentage
- partner sees recommendation and manually decides

Why:
- This is the feature that makes the thesis more than a standard booking CRUD project.

### Priority 4: product packaging

1. build at least one Web UI
2. if time remains, present Mobile as future work or lightweight prototype

Why:
- The proposal promises customer and partner portals, so backend-only is weaker at final presentation time.

## Recommended Thesis Positioning Right Now

If the thesis were reviewed today, the most accurate claim would be:

> The project already delivers a solid backend MVP for a hotel booking marketplace with role-based access, daily-inventory-based booking flow, mock payment, and partner operations; however, several proposal features remain partially implemented or not yet implemented, especially review, refund, analytics, demand forecasting, and frontend product surfaces.

This positioning is honest, defensible, and still strong.

## Suggested Next Build Order

1. Implement heuristic AI forecasting.
2. Build Web UI for customer and partner demos.

This order gives the best balance between:
- matching the proposal
- improving demo value
- preserving the current backend architecture
