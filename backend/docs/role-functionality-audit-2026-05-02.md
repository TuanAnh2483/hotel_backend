# Role Functionality Audit

Updated: 2026-05-02
Implementation update: P0/P1 frontend sync completed in this pass.

## Pham vi

Tai lieu nay ra soat chuc nang theo 3 role chinh:
- `ADMIN`
- `PARTNER`
- `CUSTOMER`

Nguon doi chieu:
- Backend Spring Boot: `src/main/java/com/hotel/hotel_backend/controller`, `service`, `security`
- Frontend React: `hotel_frontend/src/App.jsx`, `services`, `pages`, `layouts`
- Docs co san: `docs/partner-feature-status.md`, `docs/thesis-proposal-alignment-matrix.md`

Trang thai:
- `Done`: backend co API runtime va frontend da dung dung API do.
- `Partial`: co mot phan, nhung chua tron luong hoac chua day du UI/API.
- `Mismatch`: frontend/backend hoac role guard khong khop nhau.
- `Missing`: chua co API hoac chua co UI can thiet.
- `Known gap`: co API hoac UI lien quan nhung chua chon expose/hoan thien theo nghiep vu hien tai.
- `UI-only`: frontend hien thi/tinh toan local, backend chua co contract tuong ung.

## Ket luan nhanh

He thong sau dot sua nay da match tot hon giua backend role guard va frontend flow chinh.

Backend da kha day du cho MVP dat phong khach san:
- Auth/JWT/role guard da co.
- Customer co search, booking, payment mock, cancel, refund request, review API.
- Partner co hotel/room CRUD, upload anh, calendar gia-ton kho, booking list/detail, analytics, refund request, review API.
- Admin co dashboard stats, user, partner application, hotel list/update/delete, booking monitor, review moderation, refund handling, system flagged data.

Da sua trong dot nay:
- Customer booking/payment/refund routes da check dung role `CUSTOMER`.
- Frontend logout da goi backend logout API va clear local session.
- Frontend da refresh current user bang `GET /api/me` khi app load de giam stale role sau admin approve partner.
- Admin hotel update/delete da goi API that; nut create hotel fake da bo vi backend chua co endpoint create admin hotel.
- Partner da co UI complete booking va trang review/reply review.
- Customer review da co create/update/delete gan voi booking `COMPLETED`.

Phan con chua du chu yeu nam o contract/chuc nang mo rong:
- AI forecast tren frontend chi la heuristic client-side, backend chua co module/API AI forecast/recommendation.
- Direct partner refund booking co backend nhung frontend dang uu tien flow refund request.
- Customer chua co UI xem payment transaction history va trang thai refund request da gui.
- MyBookings/BookingDetail status label chua day du cho `COMPLETED`, `REFUNDED`.
- Admin create hotel chua co backend contract.
- System health UI con co phan hardcoded.
- Export report/CSV tren mot so trang van la UI-only/no-op.

## Thong ke tong quan

| Nhom | Backend API chinh | Frontend page/flow | Danh gia |
| --- | ---: | ---: | --- |
| Public/Auth | 7 public auth endpoint, 1 logout endpoint | Login, register, forgot/reset, verify email, logout | `Done` |
| Shared authenticated profile | 8 endpoint `/api/me/**` | Profile page | `Done` |
| Public hotel/catalog | Search, locations, detail, available rooms, reviews, catalog | Home, hotel list, hotel detail | `Done` |
| Admin | 17 endpoint `/api/admin/**` | 8 admin pages | `Partial` do chua co admin create hotel backend va system status hardcoded |
| Partner | 26 endpoint `/api/partner/**` | 8 nested partner pages + 1 legacy page | `Partial` do direct refund/forecast/export con chua dong bo day du |
| Customer | 9 booking endpoint, 4 review endpoint, 2 onboarding endpoint | Booking/payment/refund/reviews/onboarding | `Mostly Done` do con thieu mot so tien ich phu |

## Role model hien tai

Backend dung mot enum `UserType` duy nhat:
- `CUSTOMER`
- `PARTNER`
- `ADMIN`

He qua nghiep vu:
- User sau khi admin approve partner application se doi tu `CUSTOMER` sang `PARTNER`.
- `PARTNER` khong con duoc goi cac endpoint `hasRole('CUSTOMER')`.
- Neu muon partner van co the dat phong nhu customer, can doi thiet ke sang multi-role hoac them rule rieng.

Rui ro hien tai:
- JWT filter doc user tu database va gan authority theo `user.getUserType()`, nen backend role doi ngay sau approve.
- Frontend da refresh `user` tu `GET /api/me` khi app load neu co token, nen giam rui ro UI dung role cu trong `localStorage`.
- Neu can dong bo tuyet doi ngay sau admin approve, can them realtime notification, forced reload, hoac bat user login lai.

## Admin

### Matrix chuc nang

| Chuc nang | Backend | Frontend | Match | Ghi chu |
| --- | --- | --- | --- | --- |
| Dashboard stats | `GET /api/admin/stats` | `AdminDashboard` | `Done` | Thong ke customer, partner, hotel, booking, pending payment. |
| User list | `GET /api/admin/users` | `AdminUsers` | `Done` | Co search client-side. |
| Create user | `POST /api/admin/users` | `AdminUsers` | `Done` | Backend chi cho tao `CUSTOMER` hoac `PARTNER`, khong tao `ADMIN`. |
| Lock/unlock user | `POST /api/admin/users/{id}/toggle-status` | `AdminUsers` | `Done` | Backend chan lock admin va tang `tokenVersion`. |
| Partner application list/filter | `GET /api/admin/partner-applications?status=` | `AdminPartners` | `Done` | UI filter SUBMITTED/APPROVED/REJECTED. |
| Approve/reject partner | `POST /api/admin/partner-applications/{id}/approve|reject` | `AdminPartners` | `Done` | Approve doi user type sang `PARTNER`. |
| Hotel list | `GET /api/admin/hotels` | `AdminHotels` | `Done` | List that. |
| Admin update hotel | `PUT /api/admin/hotels/{hotelId}` | `AdminHotels` | `Done` | UI goi `adminService.updateHotel`, validate field backend yeu cau. |
| Admin delete hotel | `DELETE /api/admin/hotels/{hotelId}` | `AdminHotels` | `Done` | UI goi `adminService.deleteHotel` va reload list. |
| Admin create hotel | Chua co endpoint | Da bo nut create fake | `Known gap` | Can them backend `POST /api/admin/hotels` neu nghiep vu can admin tao hotel. |
| Booking monitor | `GET /api/admin/bookings` | `AdminBookings` | `Done` | Read-only, filter/search client-side. |
| Review list | `GET /api/admin/reviews` | `AdminReviews` | `Done` | Co filter rating client-side. |
| Delete review | `DELETE /api/admin/reviews/{reviewId}` | `AdminReviews` | `Done` | Backend refresh rating aggregate. |
| Refund list/filter | `GET /api/admin/refunds?status=` | `AdminRefunds` | `Done` | Admin thay toan bo refund request. |
| Approve/reject refund | `POST /api/admin/refunds/{id}/approve|reject` | `AdminRefunds` | `Done` | Approve goi refund mock va doi booking `REFUNDED`. |
| System flagged data | `GET /api/admin/system` | `AdminSystem` | `Partial` | Flagged booking lay tu pending refund, recent error lay tu failed payment. Service status cards tren UI dang hardcoded online. |

### Admin con thieu / can sua

Uu tien cao:
- Quyet dinh admin co duoc create hotel khong. Hien tai backend khong co endpoint, UI da bo nut create fake.

Uu tien vua:
- `AdminSystem` nen tach phan du lieu that va phan demo hardcoded. Neu can system health that, them API health detail.
- Admin chua co thao tac doi trang thai booking thu cong. Neu nghiep vu can dispute/manual override thi can them API rieng.

## Partner

### Matrix chuc nang

| Chuc nang | Backend | Frontend | Match | Ghi chu |
| --- | --- | --- | --- | --- |
| Partner dashboard | `GET /api/partner/hotels`, bookings, analytics | `PartnerDashboard` | `Done` | Lay du lieu that, co fallback loi rieng. |
| Hotel CRUD | `GET/POST/PUT/DELETE /api/partner/hotels` | `PartnerHotels` | `Done` | Co ownership check backend. |
| Hotel images | upload/delete/set cover | `PartnerHotels` | `Done` | Multipart upload + gallery/cover. |
| Room CRUD | `POST/GET/PUT/DELETE` rooms | `PartnerRooms` | `Done` | Co ownership check backend. |
| Room images | upload/delete/set cover | `PartnerRooms` | `Done` | Multipart upload + gallery/cover. |
| Daily price/inventory calendar | `GET/PUT /api/partner/rooms/{roomId}/calendar` | `PartnerCalendar` | `Done` | Upsert theo range, price/minStay/closed/availableRooms. |
| Partner booking list | `GET /api/partner/bookings` | `PartnerBookings`, dashboard/revenue | `Done` | Co filter hotel/status/check-in/page. |
| Partner booking detail | `GET /api/partner/bookings/{bookingId}` | `PartnerBookings`, `PartnerBookingDetailPage` | `Done` | Detail UI co nut complete khi du dieu kien. |
| Complete booking | `POST /api/partner/bookings/{bookingId}/complete` | `PartnerBookingDetailPage` | `Done` | Hien nut khi booking `CONFIRMED` va checkout da qua. |
| Direct refund booking | `POST /api/partner/bookings/{bookingId}/refund` | Chua expose | `Known gap` | Backend co idempotent refund bang `clientRequestId`; UI hien dang xu ly refund qua refund request. |
| Refund request list/filter | `GET /api/partner/refunds` | Tab refund trong `PartnerCalendar` | `Done` | Co approve/reject. |
| Refund request approve/reject | `POST /api/partner/refunds/{id}/approve|reject` | Tab refund trong `PartnerCalendar` | `Done` | Backend chi cho owner hotel thay request cua minh. |
| Analytics summary | `GET /api/partner/analytics/summary` | Dashboard dung API, Revenue tinh them client-side | `Partial` | Revenue page chu yeu group booking client-side, export report no-op. |
| Partner reviews list | `GET /api/partner/reviews` | `PartnerReviews` | `Done` | Co filter hotel/rating/hasReply. |
| Partner reply review | `PUT /api/partner/reviews/{reviewId}/reply` | `PartnerReviews` | `Done` | Partner reply/update reply cho review cua hotel so huu. |
| AI forecast / price recommendation | Chua co backend | `PartnerForecast` | `UI-only` | Frontend tu tinh heuristic tu bookings + holiday list, khong phai AI/API backend. Nut "Ap dung goi y" chua co handler/API. |
| Export CSV/report | Chua co backend | Nut tren booking/revenue | `UI-only` | Button hien thi nhung chua export. |
| Legacy partner manage | Dung mot so API partner | `/partner-manage` | `Partial/Legacy` | Duplicate voi partner pages moi; calendar trong trang nay update room price/quantity global, khong dung daily calendar API. |

### Partner con thieu / can sua

Uu tien cao:
- Quyet dinh dung direct refund booking hay chi dung refund request. Neu chi dung refund request, co the bo/khong expose endpoint direct refund trong UI va docs nghiep vu.

Uu tien vua:
- Doi `PartnerForecast` thanh "du bao heuristic" neu chua lam backend AI, hoac them backend forecast API.
- Them handler/API cho "Ap dung goi y gia" neu muon day gia tu forecast vao calendar.
- Them export CSV/report that hoac an nut export.
- Xoa hoac danh dau deprecated `/partner-manage` de tranh 2 UI quan ly partner khac nhau.
- Neu muon co route refund rieng, them route `/partner/refunds`; hien `PartnerLayout` co map path nay nhung `App.jsx` chua khai bao route.

## Customer

### Matrix chuc nang

| Chuc nang | Backend | Frontend | Match | Ghi chu |
| --- | --- | --- | --- | --- |
| Register | `POST /api/auth/register` | `Register` | `Done` | Dang ky customer, can verify email truoc login. |
| Login | `POST /api/auth/login` | `Login` | `Done` | Redirect theo userType. |
| Verify email | `POST /api/auth/verify-email` | `VerifyEmailPage` | `Done` | Public endpoint. |
| Forgot/reset password | `POST /api/auth/forgot-password`, `/reset-password` | `ForgotPassword`, `ResetPasswordPage` | `Done` | Token email/log mode tuy config. |
| Logout | `POST /api/auth/logout` | Navbar/Profile logout | `Done` | Frontend goi `authService.logout()` roi clear local session ke ca khi API loi. |
| Public search hotels | `GET /api/hotels/search` | Home, HotelList | `Done` | Public. |
| Public hotel detail | `GET /api/hotels/{id}` | HotelDetail | `Done` | Public. |
| Available rooms | `GET /api/hotels/{id}/available-rooms` | HotelDetail | `Done` | Public. |
| Public hotel reviews | `GET /api/hotels/{id}/reviews` | HotelDetail | `Done` | Public read. |
| Booking quote | `POST /api/bookings/quote` | Service co ham, UI chua thay dung truc tiep | `Partial` | BookingPage hien tinh tien local theo room selected, create booking se tinh lai backend. |
| Create booking | `POST /api/bookings` | `BookingPage` | `Done` | Backend reserve inventory khi tao `PENDING_PAYMENT`. |
| My bookings | `GET /api/bookings/me` | `MyBookingsPage` | `Done` | Da co status label/tab `COMPLETED`, `REFUNDED`. |
| Booking detail | `GET /api/bookings/{bookingId}` | `BookingDetailPage` | `Done` | Da co status label `COMPLETED`, `REFUNDED`. |
| Payment | `POST /api/bookings/{bookingId}/pay` | `PaymentPage` | `Done` | Mock payment bang `simulateSuccess`. |
| Payment history | `GET /api/bookings/{bookingId}/payments` | `BookingDetailPage` | `Done` | Hien transaction timeline theo booking. |
| Cancel booking | `POST /api/bookings/{bookingId}/cancel` | `BookingDetailPage` | `Done` | Backend release inventory, chan cancel booking completed. |
| Create refund request | `POST /api/bookings/{bookingId}/refund-request` | `RefundRequestPage` | `Done` | Backend yeu cau booking da co successful payment. |
| View my refund request | `GET /api/bookings/{bookingId}/refund-request` | `BookingDetailPage` | `Done` | Hien trang thai, so tien, ly do, ngay gui/xu ly. |
| My reviews | `GET /api/reviews/me` | `ReviewsPage` | `Done` | List review da tao. |
| Create review | `POST /api/reviews` | `ReviewsPage` | `Done` | UI chi hien booking `COMPLETED` chua co review. |
| Update review | `PUT /api/reviews/{reviewId}` | `ReviewsPage` | `Done` | Co modal sua rating/comment. |
| Delete review | `DELETE /api/reviews/{reviewId}` | `ReviewsPage` | `Done` | Co xoa review. |
| Become partner | `POST /api/partner-onboarding/start`, `/{id}/submit` | `BecomePartnerPage` | `Done` | Backend bat buoc verified `CUSTOMER`. |
| Profile | `/api/me/profile`, avatar, preferences, billing, notifications, change password | `ProfilePage` | `Done` | Shared cho authenticated roles. |

### Customer route guard

Backend dung `@PreAuthorize("hasRole('CUSTOMER')")` cho booking/review/onboarding customer.

Frontend da doi cac route customer chinh sang `ProtectedRoute role="CUSTOMER"`:
- `/book`
- `/customer/bookings`
- `/customer/bookings/:bookingId`
- `/payment/:bookingId`
- `/customer/refund-request/:bookingId`

He qua:
- `ADMIN` hoac `PARTNER` khong con vao UI booking/payment/refund customer roi moi bi API tra 403.
- Neu sau nay can multi-role, phai doi ca backend authority model va frontend navigation.

## Cac flow lien role

### Flow 1: Search -> booking -> payment -> partner complete -> customer review -> partner reply

Trang thai: `Done cho MVP`

Da co:
- Customer search/detail/available rooms.
- Customer create booking va pay mock.
- Partner xem booking list/detail va complete booking sau checkout.
- Customer review create/update/delete.
- Partner list/reply review cua hotel so huu.
- Public va admin xem review.

Ket luan:
- Flow search -> booking -> payment -> complete -> review -> reply da co du UI/API de demo end-to-end.

### Flow 2: Customer refund request -> partner/admin approve -> booking refunded

Trang thai: `Mostly Done`

Da co:
- Customer tao refund request.
- Partner xem/duyet/tu choi request cua hotel minh.
- Admin xem/duyet/tu choi request toan he thong.
- Backend approve goi refund mock va set booking `REFUNDED`.

Thieu:
- Can quyet dinh uu tien partner approve hay admin approve neu ca hai role cung co quyen xu ly.

### Flow 3: Customer become partner

Trang thai: `Mostly Done`

Da co:
- Customer verified email tao va submit application.
- Admin approve/reject.
- Backend approve doi user type sang `PARTNER`.

Rui ro:
- Frontend da refresh current user tu `/api/me` khi app load neu co token.
- Van nen bat user reload/login lai sau khi admin approve neu can chuyen UI ngay trong cung phien dang nhap.

### Flow 4: Admin governance

Trang thai: `Partial`

Da co:
- Admin quan ly user, partner applications, bookings, reviews, refunds.
- Admin xem hotel list.

Thieu/le:
- Admin create hotel chua co backend.
- System health UI co nhieu thong tin hardcoded.

## Security va access control

Backend:
- `SecurityConfig` permit public API/search/catalog/static va bat login cho phan con lai.
- Controller dung `@PreAuthorize` cho admin/partner/customer endpoint.
- `JwtAuthFilter` load user tu DB, check `ACTIVE`, `tokenVersion`, va set authority theo DB user type.

Frontend:
- `ProtectedRoute` check local user va optional role.
- Role-specific admin/partner route nhin chung dung.
- Customer booking/payment/refund route da set role `CUSTOMER`.
- Logout da goi backend logout API va clear local session.

Rui ro phu:
- `JwtAuthFilter` chi bo qua stale bearer cho mot so public endpoint. Neu client gui Authorization header sai vao public endpoint khac nhu `/api/catalog/options`, filter co the tra 401 truoc khi vao permitAll. Hien frontend public hotel fetch khong gui token, partner catalog fetch gui token hop le nen chua gap thuong xuyen.

## Danh sach uu tien sua

### P0 - Da sua de role match ro rang

1. Da doi customer-only routes sang `ProtectedRoute role="CUSTOMER"`:
   - `/book`
   - `/customer/bookings`
   - `/customer/bookings/:bookingId`
   - `/payment/:bookingId`
   - `/customer/refund-request/:bookingId`

2. Da sua logout frontend de goi `authService.logout()` thay vi chi clear local session.

3. Da refresh user session tu `GET /api/me` khi app load neu co token, de tranh stale role sau admin approve partner.

### P1 - Da sua de flow nghiep vu day du

1. Admin hotel page:
   - da them `adminService.updateHotel`
   - da them `adminService.deleteHotel`
   - da bo nut "Them khach san" vi backend chua co `POST /api/admin/hotels`

2. Partner booking:
   - da them service/UI cho `POST /api/partner/bookings/{bookingId}/complete`
   - nut complete hien khi booking `CONFIRMED` va checkout da qua

3. Customer review:
   - da them UI create review tu booking `COMPLETED`
   - da them UI edit review

4. Partner review:
   - da them `partnerService.getReviews`
   - da them `partnerService.replyReview`
   - da them page/tab UI cho review cua hotel so huu

### P2 - Hoan thien demo va do tin cay

1. Da them UI xem payment transaction history trong `BookingDetailPage`.
2. Da them UI xem trang thai refund request cho customer trong `BookingDetailPage`.
3. Da them status label `COMPLETED`, `REFUNDED` o MyBookings/BookingDetail.
4. Xu ly/export CSV that hoac an cac nut export no-op.
5. Doi `PartnerForecast` thanh heuristic forecast ro rang, hoac them backend forecast API.
6. Deprecate/xoa `/partner-manage` neu partner pages moi da thay the.
7. Them route `/partner/refunds` neu navbar/layout muon co trang refund rieng.

## Danh gia "da du chua"

### Backend

Danh gia: `Gan du MVP, thieu AI/gateway that va mot vai admin contract`

Backend da du cho:
- role-based marketplace core
- search/detail/availability
- booking/payment mock/cancel/refund request
- partner hotel/room/calendar/booking/analytics/refund/review
- admin user/partner/refund/review/booking/system monitoring

Backend chua du neu yeu cau:
- AI forecast/recommendation that
- payment gateway/refund provider that
- admin create hotel/full manual booking operations
- multi-role account model

### Frontend

Danh gia: `Mostly Done cho MVP, con thieu cac man hinh phu va chuc nang mo rong`

Frontend da du cho demo:
- public customer browsing
- customer booking/payment/cancel/refund request/review co ban
- partner hotel/room/calendar/booking complete/revenue/review reply co ban
- admin user/partner/booking/refund/review/hotel dashboard co ban

Frontend chua du cho demo end-to-end chuan:
- AI forecast UI dang heuristic/no backend
- export CSV/report con no-op
- system health card con hardcoded

## File entry points nen doc khi sua tiep

Backend:
- `src/main/java/com/hotel/hotel_backend/security/SecurityConfig.java`
- `src/main/java/com/hotel/hotel_backend/security/JwtAuthFilter.java`
- `src/main/java/com/hotel/hotel_backend/controller/AdminController.java`
- `src/main/java/com/hotel/hotel_backend/controller/PartnerController.java`
- `src/main/java/com/hotel/hotel_backend/controller/BookingController.java`
- `src/main/java/com/hotel/hotel_backend/controller/ReviewController.java`
- `src/main/java/com/hotel/hotel_backend/controller/PartnerOnboardingController.java`
- `src/main/java/com/hotel/hotel_backend/service/PartnerBookingService.java`
- `src/main/java/com/hotel/hotel_backend/service/HotelReviewService.java`
- `src/main/java/com/hotel/hotel_backend/service/RefundRequestService.java`

Frontend:
- `hotel_frontend/src/App.jsx`
- `hotel_frontend/src/routes/ProtectedRoute.jsx`
- `hotel_frontend/src/contexts/AuthContext.jsx`
- `hotel_frontend/src/services/adminService.js`
- `hotel_frontend/src/services/partnerService.js`
- `hotel_frontend/src/services/bookingService.js`
- `hotel_frontend/src/services/reviewService.js`
- `hotel_frontend/src/pages/admin/AdminHotels.jsx`
- `hotel_frontend/src/pages/partner/PartnerBookings.jsx`
- `hotel_frontend/src/pages/partner/PartnerCalendar.jsx`
- `hotel_frontend/src/pages/partner/PartnerForecast.jsx`
- `hotel_frontend/src/pages/partner/PartnerReviews.jsx`
- `hotel_frontend/src/pages/customer/ReviewsPage.jsx`
