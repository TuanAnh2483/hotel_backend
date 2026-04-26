# Postman Manual Smoke

Collection này bám theo controller và DTO hiện tại trong workspace, để import vào Postman rồi test theo đúng flow phụ thuộc của backend.

## File cần import

- `docs/postman/hotel-backend-manual-smoke.postman_collection.json`
- `docs/postman/hotel-backend-local.postman_environment.json`
- `docs/postman/hotel-backend-predeploy.postman_environment.json`

## Cách chạy local nên dùng

Nếu muốn test auth bằng account mới ngay trong Postman mà không phụ thuộc SMTP thật, chạy backend local với debug token:

```powershell
$env:MAIL_ENABLED="false"
$env:MAIL_EXPOSE_DEBUG_TOKENS="true"
.\mvnw.cmd spring-boot:run
```

Khi đó:

- `register` có thể trả `verificationToken` trong response để Postman script tự lưu vào environment
- link verify/reset cũng được log ra console

Lưu ý: flow `forgot-password` hiện **không** trả raw `resetToken` trong response body. Sau khi gọi request này, bạn phải copy token từ log backend hoặc email thật rồi dán vào biến `resetToken` trong environment.

Nếu bạn chạy collection nhiều lần trên cùng DB và account `customerEmail` đã tồn tại, hãy:

- đổi `customerEmail` trong environment sang email mới
- hoặc bỏ qua `Register Customer` và `Verify Email`, đi thẳng vào `Login Customer`

## Nếu test gần production

Khi không muốn dùng debug token hay log mail nữa:

- dùng environment `docs/postman/hotel-backend-predeploy.postman_environment.json`
- bật `MAIL_ENABLED=true`
- giữ `MAIL_EXPOSE_DEBUG_TOKENS=false`
- cấu hình `UPLOAD_PROVIDER=cloudinary` hoặc `s3`

Runbook chi tiết nằm ở `docs/predeploy-real-smoke.md`.

## Thứ tự chạy đề xuất

1. `1. Health & Catalog/Health`
2. `2. Auth - Customer/Register Customer`
3. `2. Auth - Customer/Verify Email`
4. `2. Auth - Customer/Login Customer`
5. `3. Partner Onboarding/Start Partner Onboarding`
6. `3. Partner Onboarding/Submit Partner Onboarding`
7. `4. Admin Approval/Login Admin`
8. `4. Admin Approval/Approve Partner Application`
9. `4. Admin Approval/Login Partner`
10. `5. Partner Inventory/Create Hotel`
11. `5. Partner Inventory/Create Room`
12. `6. Partner Calendar/Upsert Calendar Block`
13. `7. Partner Images/*`
14. `8. Public APIs/*`
15. `9. Customer Booking Flow/*`

## Biến nào được auto lưu

Postman test script trong collection sẽ tự lưu các biến sau khi request thành công:

- `verificationToken`
- `customerToken`
- `adminToken`
- `partnerToken`
- `applicationId`
- `hotelId`
- `roomId`
- `hotelImageUrl`
- `hotelImageUrlAlt`
- `roomImageUrl`
- `roomImageUrlAlt`
- `bookingId`

## Lưu ý cho upload file

Hai request upload ảnh đã được cấu hình `form-data`, nhưng path file export ra chỉ là placeholder:

- `C:/replace-me/hotel-cover.png`
- `C:/replace-me/hotel-lobby.jpg`
- `C:/replace-me/room-a.png`
- `C:/replace-me/room-b.jpg`

Sau khi import collection vào Postman, mở từng request upload và chọn lại file thật trên máy.

## Provider upload

Collection này dùng được cho cả `local`, `cloudinary`, và `s3`. Khác biệt chủ yếu nằm ở `imageUrl` backend trả về:

- `local`: thường là `/uploads/...`
- `cloudinary`: URL Cloudinary thật
- `s3`: URL public từ S3/CDN

Flow request của Postman không cần đổi.

## Boundary hiện tại

Collection này có cả request `pay` và `refund`, nhưng code backend hiện vẫn đang dùng `SIMULATED` cho payment/refund. Nếu bạn cần test payment gateway thật hoặc refund thật trước deploy, đó là khoảng trống implementation chứ không phải chỉ là thiếu cấu hình Postman.
