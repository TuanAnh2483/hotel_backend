# Free Payment Platform Plan: SePay + VietQR

Tài liệu này rà lại flow payment hiện tại và mô tả hướng triển khai nền tảng miễn phí trước cho dự án HotelHub.

## Quyết định

Ưu tiên tích hợp `SePay + VietQR` trước.

Lý do:

- SePay đang có gói `FREE` 0đ/tháng, 50 giao dịch/tháng, hỗ trợ Webhook/API.
- Flow phù hợp với MVP hotel: khách quét QR chuyển khoản, backend tự xác nhận khi có webhook.
- Không cần xử lý thẻ quốc tế, ví điện tử, ký quỹ phức tạp ở giai đoạn đầu.
- Có thể giữ mock payment hiện tại làm fallback dev/test.

Nguồn tham khảo chính:

- SePay pricing: https://sepay.vn/bang-gia.html
- SePay webhook docs: https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook
- SePay reconciliation docs: https://developer.sepay.vn/en/sepay-webhooks/doi-soat-giao-dich
- VietQR generate API: https://www.vietqr.io/generate/

## Flow hiện tại trong code

Backend hiện có:

- `POST /api/bookings/quote`: kiểm tra khả dụng và tính giá, không giữ inventory.
- `POST /api/bookings`: giữ inventory, tạo booking `PENDING_PAYMENT`, set `expiresAt` khoảng 15 phút.
- `POST /api/bookings/{bookingId}/pay`: payment giả lập, nếu `simulateSuccess=true` thì đổi booking sang `CONFIRMED`.
- `GET /api/bookings/{bookingId}/payments`: trả lịch sử transaction.
- `BookingExpirationService`: booking `PENDING_PAYMENT` quá hạn sẽ chuyển `CANCELLED` và release inventory.
- Refund hiện cũng đang ghi transaction giả lập `SIMULATED`.

Frontend hiện có:

- `PaymentPage.jsx` có UI card, bank, wallet.
- Dù chọn phương thức nào, nút thanh toán vẫn gọi `bookingService.payBooking()` với `simulateSuccess`.
- Bank transfer hiện chỉ là QR icon giả và thông tin tài khoản hard-code.
- `BookingDetailPage.jsx` đã đọc payment timeline và có UI badge `PENDING`, nhưng backend enum hiện chỉ có `SUCCESS`, `FAILED`.

## Gaps cần xử lý

Các điểm chưa chuẩn để nối payment thật:

- `PaymentTransactionStatus` chưa có `PENDING`.
- `PaymentMethod` chỉ có `SIMULATED`.
- Chưa có payment session để tạo QR/thông tin chuyển khoản cho từng booking.
- Chưa lưu `paymentCode` riêng để match giao dịch ngân hàng với booking.
- Chưa có webhook endpoint public cho SePay.
- Chưa verify webhook bằng API key/header.
- Chưa có idempotency theo `SePay transaction id` hoặc `referenceCode`.
- Chưa có reconciliation job để bù trường hợp webhook bị miss.
- Chưa có policy rõ cho giao dịch đến sau khi booking đã hết hạn.

## Target Flow

Flow ưu tiên cho MVP:

1. Customer tạo booking.
2. Backend tạo booking `PENDING_PAYMENT` và giữ inventory.
3. Customer vào trang `/payment/{bookingId}`.
4. Frontend gọi `POST /api/bookings/{bookingId}/payment-session`.
5. Backend tạo hoặc reuse một `PaymentTransaction` trạng thái `PENDING`.
6. Backend sinh `paymentCode`, ví dụ `HHB12345A9`.
7. Backend tạo QR VietQR với:
   - tài khoản nhận tiền
   - số tiền booking
   - nội dung chuyển khoản = `paymentCode`
8. Customer quét QR và chuyển khoản đúng số tiền.
9. SePay nhận biến động số dư và gọi webhook về backend.
10. Backend verify webhook, match `paymentCode`, check amount, check booking còn payable.
11. Nếu hợp lệ:
    - `PaymentTransaction.PENDING -> SUCCESS`
    - `Booking.PENDING_PAYMENT -> CONFIRMED`
    - `booking.expiresAt = null`
12. Frontend poll booking/payment timeline, thấy `CONFIRMED` thì chuyển sang trang success.

Không dùng return page làm nguồn xác nhận thanh toán. Webhook hoặc reconciliation mới là source of truth.

## Payment Code

VietQR `addInfo` có giới hạn ngắn, nên payment code cần ngắn và chỉ dùng ký tự an toàn.

Đề xuất:

```text
HHB{bookingId}{random4}
```

Ví dụ:

```text
HHB1287A9F2
```

Rule:

- Lưu `paymentCode` vào `PaymentTransaction`.
- Unique theo `paymentCode`.
- QR content chỉ chứa payment code, không thêm tiếng Việt có dấu.
- Khi nhận webhook, ưu tiên dùng field `code` của SePay nếu có; fallback parse trong `content`/`description`.

## Backend Changes

### Enum

Mở rộng `PaymentMethod`:

```java
public enum PaymentMethod {
    SIMULATED,
    VIETQR_SEPAY
}
```

Mở rộng `PaymentTransactionStatus`:

```java
public enum PaymentTransactionStatus {
    PENDING,
    SUCCESS,
    FAILED
}
```

Nếu muốn rõ hơn cho vận hành, có thể thêm `EXPIRED` hoặc `MANUAL_REVIEW`, nhưng MVP có thể dùng `FAILED + failureReason`.

### PaymentTransaction fields

Nên thêm tối thiểu:

- `paymentCode`: mã chuyển khoản để match booking.
- `gateway`: ví dụ `SEPAY`.
- `gatewayTransactionId`: `id` từ SePay webhook.
- `gatewayReferenceCode`: `referenceCode` từ SePay.
- `paidAt`: thời điểm thanh toán thành công.
- `expiresAt`: hạn thanh toán của transaction/session.
- `rawPayload`: payload webhook để audit/debug.

Không cần lưu ảnh QR vào DB. QR có thể generate lại từ payment session.

### API mới

Customer:

```http
POST /api/bookings/{bookingId}/payment-session
Authorization: Bearer <customer-token>
```

Response đề xuất:

```json
{
  "paymentTransactionId": 10,
  "bookingId": 1287,
  "method": "VIETQR_SEPAY",
  "status": "PENDING",
  "amount": 1500000,
  "paymentCode": "HHB1287A9F2",
  "transferContent": "HHB1287A9F2",
  "bankAccountNo": "123456789",
  "bankAccountName": "HOTELHUB",
  "bankName": "ACB",
  "qrImageUrl": "data:image/png;base64,...",
  "expiresAt": "2026-05-03T15:30:00"
}
```

Webhook public:

```http
POST /api/payments/webhooks/sepay
Authorization: Apikey <configured-key>
Content-Type: application/json
```

Response thành công theo rule SePay:

```json
{
  "success": true
}
```

### Webhook request cần xử lý

SePay gửi các field quan trọng:

- `id`
- `gateway`
- `transactionDate`
- `accountNumber`
- `code`
- `content`
- `transferType`
- `transferAmount`
- `referenceCode`
- `description`

Rule xử lý:

1. Verify `Authorization` header.
2. Chỉ nhận `transferType = in`.
3. Match `paymentCode` từ `code`, nếu null thì parse từ `content`/`description`.
4. Tìm `PaymentTransaction` `PENDING` theo `paymentCode`.
5. Check `transferAmount == transaction.amount`.
6. Check booking vẫn `PENDING_PAYMENT` và chưa hết hạn.
7. Check idempotency:
   - nếu `gatewayTransactionId` đã xử lý rồi thì trả `success=true`, không update lại.
   - nếu payment đã `SUCCESS` thì trả `success=true`.
8. Update transaction và booking trong cùng transaction DB.

Nếu amount sai, code sai, booking hết hạn, hoặc booking đã cancelled:

- Không confirm booking.
- Lưu transaction/payload vào log hoặc record `FAILED/MANUAL_REVIEW`.
- Vẫn cân nhắc trả `success=true` để SePay không retry vô hạn với case dữ liệu business sai.

## Frontend Changes

Payment page nên đổi hướng:

- Default method = `bank`.
- Hiển thị QR thật từ `payment-session`.
- Ẩn hoặc disable `card` và `wallet` với nhãn "Sẽ hỗ trợ sau".
- Bỏ checkbox `Mô phỏng thanh toán thành công` khỏi UI production.
- Thêm polling:
  - mỗi 3-5 giây gọi `GET /api/bookings/{bookingId}`
  - nếu status `CONFIRMED` thì navigate `payment-success`
  - nếu status `CANCELLED` thì show expired/fail
- Vẫn cho customer quay lại booking detail.

`bookingService.js` cần thêm:

```js
createPaymentSession(bookingId) {
  return authedFetch(`/api/bookings/${bookingId}/payment-session`, {
    method: "POST",
  });
}
```

## SePay Setup Guide

1. Tạo tài khoản SePay gói free.
2. Liên kết tài khoản ngân hàng nhận tiền.
3. Vào phần cấu hình payment code, đặt prefix dễ nhận diện, ví dụ `HHB`.
4. Tạo webhook:
   - Event: tiền vào.
   - Bank account: tài khoản nhận tiền.
   - Ignore if no payment code found: bật nếu đã cấu hình nhận diện code ổn.
   - Call URL local qua ngrok: `https://<ngrok-domain>/api/payments/webhooks/sepay`.
   - Authentication: API Key.
   - Request Content Type: `application/json`.
   - Payment verification webhook: Yes.
   - Retry khi HTTP status không nằm trong `200-299`.
5. Lưu API key vào env backend.
6. Dùng giao dịch giả lập/sandbox hoặc chuyển khoản nhỏ để test.

Local webhook bằng ngrok:

```powershell
ngrok http 8080
```

## Config đề xuất

`application.yaml`:

```yaml
app:
  payment:
    provider: ${PAYMENT_PROVIDER:simulated}
    transfer-prefix: ${PAYMENT_TRANSFER_PREFIX:HHB}
    bank:
      account-no: ${PAYMENT_BANK_ACCOUNT_NO:}
      account-name: ${PAYMENT_BANK_ACCOUNT_NAME:}
      bank-name: ${PAYMENT_BANK_NAME:}
      acq-id: ${PAYMENT_BANK_ACQ_ID:}
    sepay:
      webhook-api-key: ${PAYMENT_SEPAY_WEBHOOK_API_KEY:}
      api-token: ${PAYMENT_SEPAY_API_TOKEN:}
    vietqr:
      client-id: ${PAYMENT_VIETQR_CLIENT_ID:}
      api-key: ${PAYMENT_VIETQR_API_KEY:}
```

PowerShell local:

```powershell
$env:PAYMENT_PROVIDER="sepay-vietqr"
$env:PAYMENT_TRANSFER_PREFIX="HHB"
$env:PAYMENT_BANK_ACCOUNT_NO="replace-bank-account"
$env:PAYMENT_BANK_ACCOUNT_NAME="HOTELHUB"
$env:PAYMENT_BANK_NAME="ACB"
$env:PAYMENT_BANK_ACQ_ID="970416"
$env:PAYMENT_SEPAY_WEBHOOK_API_KEY="replace-sepay-webhook-api-key"
$env:PAYMENT_SEPAY_API_TOKEN="replace-sepay-api-token"
$env:PAYMENT_VIETQR_CLIENT_ID="replace-vietqr-client-id"
$env:PAYMENT_VIETQR_API_KEY="replace-vietqr-api-key"
```

## Reconciliation

Webhook là realtime nhưng không nên là cơ chế duy nhất.

Nên thêm job định kỳ:

- Mỗi 5-15 phút gọi SePay Transaction API lấy giao dịch gần đây.
- Match theo `id/referenceCode/paymentCode`.
- Transaction nào có trên SePay nhưng chưa có trong DB thì xử lý lại bằng cùng service của webhook.

Mục tiêu:

- Server deploy/restart không làm mất giao dịch.
- Webhook timeout/retry thất bại vẫn có cơ chế bù.
- Dễ đối soát khi customer báo đã chuyển khoản.

## Chính sách case khó

### Khách chuyển thiếu tiền

Không confirm booking. Đưa vào manual review hoặc trả thông báo "Số tiền chưa khớp".

### Khách chuyển dư tiền

MVP nên đưa manual review. Không tự hoàn tiền vì refund thật chưa có.

### Khách chuyển sau khi booking hết hạn

Không tự confirm vì inventory đã release. Đưa manual review để admin xử lý.

### Webhook duplicate

Không tạo transaction mới. Dựa trên `gatewayTransactionId` hoặc `referenceCode`.

### Customer đóng trang payment

Không ảnh hưởng. Booking vẫn được confirm khi webhook đến.

## Implementation Order

1. Thêm enum/status/fields cho `PaymentTransaction`.
2. Thêm DTO `PaymentSessionResponse` và `SepayWebhookRequest`.
3. Thêm config properties `app.payment.*`.
4. Thêm service tạo payment session:
   - validate booking owner
   - validate booking `PENDING_PAYMENT`
   - reuse pending session nếu còn hạn
   - sinh QR VietQR
5. Thêm webhook controller public.
6. Thêm webhook service xử lý idempotent.
7. Permit route webhook trong `SecurityConfig`.
8. Sửa `PaymentPage.jsx` để gọi session và poll status.
9. Thêm integration tests cho session/webhook.
10. Build frontend và copy static artifacts nếu chạy qua backend 8080.

## Test Plan

Backend tests cần có:

- Create payment session cho booking `PENDING_PAYMENT`.
- Không tạo session cho booking không thuộc customer.
- Reuse session pending khi gọi lại.
- Webhook success đổi booking sang `CONFIRMED`.
- Webhook duplicate không tạo double success.
- Webhook sai amount không confirm booking.
- Webhook `transferType=out` bị bỏ qua.
- Webhook sau khi booking expired không confirm booking.

Manual local test:

1. Start backend:

```powershell
.\mvnw.cmd spring-boot:run
```

2. Start ngrok:

```powershell
ngrok http 8080
```

3. Cấu hình webhook URL trên SePay bằng domain ngrok.
4. Tạo booking mới.
5. Vào `/payment/{bookingId}`.
6. Quét QR/chuyển khoản hoặc tạo giao dịch giả lập.
7. Kiểm tra booking chuyển `CONFIRMED`.
8. Kiểm tra payment timeline có transaction `VIETQR_SEPAY/SUCCESS`.

Regression commands sau khi code:

```powershell
.\mvnw.cmd "-Dtest=BookingIntegrationTest" test
.\mvnw.cmd "-Dtest=AuthToPaymentFlowIntegrationTest" test
cd hotel_frontend
npm run build
```

## Chưa làm ở phase miễn phí

- Card Visa/Mastercard.
- Ví MoMo/ZaloPay.
- Refund tự động qua ngân hàng.
- Virtual account theo từng booking.
- Payment gateway tổng hợp nhiều provider.

Các phần này nên để sau khi `SePay + VietQR` chạy ổn.
