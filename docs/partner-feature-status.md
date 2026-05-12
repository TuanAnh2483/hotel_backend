# Partner Feature Status

Updated: 2026-04-23

## Scope

This table tracks the current backend status of partner-facing features only.

Status legend:
- `Done`: runtime endpoint/flow exists and is exercised by tests
- `Partial`: some support exists, but the partner flow is not fully complete
- `Missing`: no usable partner-facing backend flow yet

## Status Table

| Feature | Status | Endpoint / Flow | Notes |
| --- | --- | --- | --- |
| Start partner onboarding | `Done` | `POST /api/partner-onboarding/start` | Customer starts the application before becoming a partner. |
| Submit partner onboarding | `Done` | `POST /api/partner-onboarding/{applicationId}/submit` | Application is sent for admin review. |
| Partner approval support | `Done` | `POST /api/admin/partner-applications/{id}/approve` | Not a partner endpoint, but required to unlock partner role. |
| List owned hotels | `Done` | `GET /api/partner/hotels` | Returns hotels owned by the authenticated partner. |
| Create hotel | `Done` | `POST /api/partner/hotels` | Core inventory onboarding flow is ready. |
| Update hotel | `Done` | `PUT /api/partner/hotels/{id}` | Partner can update only owned hotels. |
| Delete hotel | `Done` | `DELETE /api/partner/hotels/{id}` | Protected by ownership checks and room constraints. |
| Create room | `Done` | `POST /api/partner/hotels/{hotelId}/rooms` | Room inventory source for booking/search. |
| List rooms by hotel | `Done` | `GET /api/partner/hotels/{hotelId}/rooms` | Read model for hotel setup screens. |
| Update room | `Done` | `PUT /api/partner/rooms/{roomId}` | Supports editing room attributes. |
| Delete room | `Done` | `DELETE /api/partner/rooms/{roomId}` | Removes owned room safely. |
| Read room calendar | `Done` | `GET /api/partner/rooms/{roomId}/calendar` | Returns daily rate + daily inventory snapshot by range. |
| Patch room calendar | `Done` | `PUT /api/partner/rooms/{roomId}/calendar` | Supports `price`, `minStay`, `closed`, `availableRooms` by block date range. |
| List partner bookings | `Done` | `GET /api/partner/bookings` | Supports filters by hotel, status, and check-in range. |
| Get booking detail | `Done` | `GET /api/partner/bookings/{bookingId}` | Ownership-scoped booking detail for dashboard drill-down. |
| Complete booking | `Done` | `POST /api/partner/bookings/{bookingId}/complete` | Marks eligible confirmed booking as `COMPLETED` after stay end. |
| Refund booking | `Done` | `POST /api/partner/bookings/{bookingId}/refund` | Mock refund with idempotent `clientRequestId`; future confirmed booking releases inventory. |
| Revenue analytics summary | `Done` | `GET /api/partner/analytics/summary` | Returns booking counts, gross revenue, refunded amount, and net revenue. |
| Partner review management | `Done` | `GET /api/partner/reviews`, `PUT /api/partner/reviews/{reviewId}/reply` | Partner can list reviews of owned hotels and reply to customer reviews. |
| Partner AI insight / forecasting | `Missing` | N/A | No forecast/recommendation module exposed to partner yet. |

## This Round

Implemented in this round:
- booking completion for partner
- mock refund flow for partner
- partner analytics summary
- partner review list + reply flow
- status tracking document for partner scope

Main code entry points:
- `src/main/java/com/hotel/hotel_backend/controller/PartnerController.java`
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java`
- `src/main/java/com/hotel/hotel_backend/service/PartnerRoomCalendarService.java`

Main test coverage:
- `src/test/java/com/hotel/hotel_backend/controller/PartnerBookingIntegrationTest.java`
- `src/test/java/com/hotel/hotel_backend/controller/PartnerRoomCalendarIntegrationTest.java`
