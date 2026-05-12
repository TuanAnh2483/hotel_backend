# Predeploy Real Smoke

Mục tiêu của checklist này là test backend bằng hạ tầng và dữ liệu thật trước deploy, đồng thời tránh nhầm những flow còn simulated là “đã production-ready”.

## Phần nào đã có thể test thật

- PostgreSQL thật qua `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- SMTP thật qua `MAIL_ENABLED=true` + `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- Upload ảnh thật qua:
  - `UPLOAD_PROVIDER=cloudinary`
  - hoặc `UPLOAD_PROVIDER=s3`
- Public URL ảnh thật từ Cloudinary hoặc S3/CDN
- Auth token thật, role thật, ownership thật
- Search, hotel detail, available rooms, inventory reservation, booking persistence trên DB thật

## Phần nào hiện vẫn chưa phải real integration

Những chỗ này chưa nên gọi là test “thật” ở mức external provider:

- `POST /api/bookings/{bookingId}/pay`
  - request còn dùng field `simulateSuccess`
  - `PaymentMethod` hiện chỉ có `SIMULATED`
  - `providerReference` được sinh dạng `SIM-...`
- `POST /api/partner/bookings/{bookingId}/refund`
  - refund transaction hiện ghi `SIM-REFUND-...`
  - không gọi cổng refund thật

Nói ngắn: booking, state transition, inventory, audit record có thể test thật trên DB thật; nhưng payment/refund provider thì hiện vẫn là giả lập trong code.

## Cấu hình nên dùng trước deploy

Ví dụ PowerShell cho mode gần production:

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/hotel_mvp"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="123456"

$env:MAIL_ENABLED="true"
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="replace-real-smtp-user"
$env:MAIL_PASSWORD="replace-real-smtp-password"
$env:MAIL_FROM="replace-real-sender@example.com"
$env:MAIL_EXPOSE_DEBUG_TOKENS="false"

$env:UPLOAD_PROVIDER="cloudinary"
$env:UPLOAD_CLOUDINARY_ENABLED="true"
$env:UPLOAD_CLOUDINARY_CLOUD_NAME="replace-cloud-name"
$env:UPLOAD_CLOUDINARY_API_KEY="replace-api-key"
$env:UPLOAD_CLOUDINARY_API_SECRET="replace-api-secret"
$env:UPLOAD_CLOUDINARY_FOLDER_PREFIX="hotel-backend-predeploy"

$env:JPA_DDL_AUTO="validate"
$env:ADMIN_SEED_ENABLED="true"
$env:ADMIN_EMAIL="replace-admin-email@example.com"
$env:ADMIN_PASSWORD="replace-admin-password"

.\mvnw.cmd spring-boot:run
```

Nếu bạn dùng S3 thay cho Cloudinary:

```powershell
$env:UPLOAD_PROVIDER="s3"
$env:UPLOAD_S3_ENABLED="true"
$env:UPLOAD_S3_BUCKET="replace-bucket"
$env:UPLOAD_S3_REGION="ap-southeast-1"
$env:UPLOAD_S3_ACCESS_KEY="replace-access-key"
$env:UPLOAD_S3_SECRET_KEY="replace-secret-key"
$env:UPLOAD_S3_KEY_PREFIX="hotel-backend-predeploy"
$env:UPLOAD_S3_PUBLIC_BASE_URL="https://replace-cdn-or-public-base"
```

## Postman nên dùng file nào

- Collection: `docs/postman/hotel-backend-manual-smoke.postman_collection.json`
- Environment gần production: `docs/postman/hotel-backend-predeploy.postman_environment.json`

## Thứ tự smoke khuyến nghị

1. `Health`
2. `Catalog Options`
3. `Register Customer`
4. `Verify Email`
   - với mode real SMTP, lấy token từ email thật thay vì debug token
5. `Login Customer`
6. `Start Partner Onboarding`
7. `Submit Partner Onboarding`
8. `Login Admin`
9. `Approve Partner Application`
10. `Login Partner`
11. `Create Hotel`
12. `Create Room`
13. `Upsert Calendar Block`
14. `Upload Hotel Images`
15. `Upload Room Images`
16. `Search Hotels`
17. `Get Hotel Detail`
18. `Get Available Rooms`
19. `Quote Booking`
20. `Create Booking`
21. `Get Booking Detail`
22. `Payment Timeline`
23. `Pay Booking - Simulated Success`
24. `List Partner Bookings`
25. `Get Partner Booking Detail`
26. `Analytics Summary`

## Điểm pass/fail nên check

- Email verification mail đến inbox thật
- Forgot password mail đến inbox thật
- Ảnh upload lên Cloudinary/S3 và mở public URL được
- Hotel search nhìn thấy khách sạn vừa tạo
- Available rooms phản ánh đúng `calendar` và `quantity`
- Tạo booking làm phát sinh record thật trong PostgreSQL
- `PENDING_PAYMENT` giữ inventory đúng
- Bước pay simulated chuyển booking sang `CONFIRMED`
- Partner dashboard nhìn thấy booking vừa tạo
- Analytics cộng đúng tổng booking và revenue

## Điểm chặn trước deploy

Nếu mục tiêu của deploy là “thanh toán thật” hoặc “refund thật”, thì hiện backend chưa đạt vì contract payment/refund vẫn simulated trong code. Lúc đó nên coi đây là blocker kỹ thuật, không phải chỉ là thiếu test.
