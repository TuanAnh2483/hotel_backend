# Real Data Audit - 2026-04-27

## Mục tiêu

Rà lại các màn đang hiển thị số liệu ở frontend/admin/partner để:

- bỏ số hardcode hoặc số suy diễn không đi từ API/DB,
- sửa các màn đang tính tiền lệch với `totalPrice` / `stayPrice` của backend,
- giữ lại các số dự báo/chỉ báo chỉ khi chúng được dựng từ dữ liệu booking/phòng thật.

## Kết luận backend

Trong vòng rà này không cần đổi contract backend cho phần số liệu đang hiển thị.

Các API backend hiện tại đã trả đủ dữ liệu thật cho các màn vừa sửa:

- `GET /api/partner/bookings`
- `GET /api/partner/bookings/{bookingId}`
- `GET /api/partner/analytics/summary`
- `GET /api/partner/hotels`
- `GET /api/partner/hotels/{hotelId}/rooms`
- `GET /api/bookings/{bookingId}`
- `GET /api/admin/stats`
- `GET /api/admin/system`

Vấn đề chính nằm ở frontend:

- tự cộng thêm `thuế/phí 10%` dù backend không lưu khoản này,
- hiển thị `stayPrice` sai khi `quantity > 1`,
- dùng số giả trong dashboard/forecast/system widgets,
- dùng fallback kiểu `roomCount || 5`, `totalRooms || 10`, `+12.5%`, `+4`, `120 điểm`, `1234 5678 9012`.

## File đã thêm

- `hotel_frontend/src/services/partnerInsights.js`

Mục đích:

- gom helper tải `hotel + room + booking detail`,
- tính số phòng thực tế,
- tính số phòng đã giữ theo ngày từ booking thật,
- tái sử dụng cho partner dashboard/forecast.

## File đã sửa

### Partner

- `hotel_frontend/src/pages/partner/PartnerDashboard.jsx`
  - bỏ sparkline hardcode,
  - lấy số khách sạn, số phòng, booking tháng, doanh thu tháng từ API thật,
  - tính công suất hôm nay từ `booking detail + room quantity` thật,
  - thay insight “3 khách sạn / +10%” bằng insight dựng từ dữ liệu hiện có.

- `hotel_frontend/src/pages/partner/PartnerForecast.jsx`
  - bỏ `roomCount || 5`, `totalRooms || 10`, holiday boost giả, khuyến nghị `%` giả,
  - dựng forecast vận hành theo số phòng thật và booking thật,
  - hiển thị `bookedUnits / totalRoomQuantity` theo ngày,
  - tổng hợp insight cuối trang từ dữ liệu thật thay vì card chiến lược hardcode.

- `hotel_frontend/src/pages/partner/PartnerRevenue.jsx`
  - bỏ `+12.5%`, `+4`, `-0.8%` hardcode,
  - tính doanh thu/đơn hoàn tất/tỷ lệ hủy theo năm từ booking thật,
  - so sánh với năm trước bằng dữ liệu thật.

- `hotel_frontend/src/pages/partner/PartnerRooms.jsx`
  - bỏ gợi ý AI `+15%` giả,
  - bỏ diện tích giả kiểu `25 + i * 5 m²`,
  - thay bằng tóm tắt dựa trên giá, số phòng, sức chứa thật của form/room.

- `hotel_frontend/src/pages/partner/PartnerBookings.jsx`
  - sửa line item trong modal chi tiết để `stayPrice * quantity` khớp tổng thực tế.

- `hotel_frontend/src/pages/partner/PartnerBookingDetailPage.jsx`
  - sửa line item để hiển thị đúng `giá 1 phòng cho cả kỳ ở` và `tổng dòng`,
  - bỏ dòng `Thuế & Phí (0%)` vì backend không có khoản này.

### Customer booking / payment

- `hotel_frontend/src/pages/HotelDetailPage.jsx`
  - bỏ cộng `thuế & phí 10%`,
  - sidebar dùng `stayPrice` thật của room cho tổng kỳ ở,
  - chỉ giữ `price` như giá trung bình mỗi đêm.

- `hotel_frontend/src/pages/BookingPage.jsx`
  - bỏ cộng `thuế & phí 10%`,
  - dùng `room.stayPrice` làm subtotal/tổng để khớp backend.

- `hotel_frontend/src/pages/BookingDetailPage.jsx`
  - sửa line item để tổng dòng = `stayPrice * quantity`,
  - giữ `booking.totalPrice` làm tổng cuối cùng.

- `hotel_frontend/src/pages/PaymentPage.jsx`
  - sửa line item trong summary để tổng dòng = `stayPrice * quantity`,
  - bỏ số giả `120 điểm`,
  - bỏ số tài khoản bank giả và thay bằng thông tin mô phỏng không gây hiểu nhầm.

### Admin

- `hotel_frontend/src/pages/admin/AdminDashboard.jsx`
  - bỏ block system info tĩnh kiểu `1.0.0`, `24 giờ`,
  - thay bằng tín hiệu vận hành lấy từ `admin stats + admin system data`.

- `hotel_frontend/src/pages/admin/AdminSystem.jsx`
  - bỏ grid service status với latency hardcode (`12ms`, `230ms`, ...),
  - thay bằng summary cards dựng từ `flaggedBookings` và `recentErrors` thật.

## Tác động nghiệp vụ

- Tổng tiền ở các màn customer/partner giờ khớp với `booking.totalPrice` của backend.
- Các line item không còn bị thấp hơn thực tế khi một booking có `quantity > 1`.
- Dashboard/forecast/revenue/system không còn hiển thị số “đẹp” nhưng giả.
- Các chỉ báo vận hành hiện nay đều đi từ booking/phòng thật hoặc đã bị loại bỏ nếu không có dữ liệu gốc.

## Build / verify

- Frontend build đã pass bằng:

```powershell
npm run build
```

- Bundle mới đã được copy vào:
  - `src/main/resources/static`
  - `target/classes/static`

để Spring Boot ở `localhost:8080` dùng luôn bản frontend mới.

## Commands đã dùng và ý nghĩa

```powershell
Get-ChildItem ... | Select-String ...
```

- Dò toàn bộ repo để tìm số hardcode, fallback giả, hoặc điểm dùng `stayPrice`/`10%` sai logic.

```powershell
npm run build
```

- Build production frontend để bắt lỗi import, JSX, hook usage và đảm bảo bundle tạo ra thành công.

```powershell
Copy-Item -Path hotel_frontend\\dist\\* -Destination src\\main\\resources\\static -Recurse -Force
Copy-Item -Path hotel_frontend\\dist\\* -Destination target\\classes\\static -Recurse -Force
```

- Đẩy bundle frontend mới sang thư mục static mà Spring Boot đang phục vụ.

```powershell
git status --short
```

- Kiểm tra worktree để tránh đụng vào thay đổi có sẵn không thuộc task này.

## Lưu ý còn lại

- Một số màn vẫn còn nội dung mô phỏng không phải số DB, ví dụ icon/ảnh placeholder hoặc flow thanh toán giả lập. Các phần đó không còn hiển thị số cứng gây hiểu nhầm sau đợt sửa này.
- Chưa chạy backend integration test trong vòng này vì không thay đổi contract Java cho phần số liệu hiển thị.
