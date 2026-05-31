# Partner Image Management

Tài liệu này mô tả đầy đủ flow ảnh cho `hotel` và `room` theo đúng thứ tự triển khai hiện tại:

1. Upload ảnh thật
2. Xóa ảnh đã upload
3. Đặt ảnh cover riêng
4. Chuyển storage provider giữa `local`, `cloudinary`, `s3`

## 1. Kết quả hiện tại

Backend hiện hỗ trợ các capability sau:

- Partner upload ảnh thật bằng `multipart/form-data`
- Partner xóa từng ảnh khỏi gallery
- Partner chọn một ảnh trong gallery làm `coverImageUrl`
- API partner và API public đều trả ra:
  - `coverImageUrl`
  - `imageUrls`
- Provider upload có thể đổi bằng config:
  - `local`
  - `cloudinary`
  - `s3`

Nếu `coverImageUrl` đang rỗng hoặc ảnh cover bị xóa, backend tự fallback về ảnh đầu tiên trong `imageUrls`. Nếu gallery rỗng, `coverImageUrl = null`.

## 2. API hiện có

Hotel:

- `POST /api/partner/hotels/{id}/images`
- `DELETE /api/partner/hotels/{id}/images?imageUrl=...`
- `PUT /api/partner/hotels/{id}/cover-image`

Room:

- `POST /api/partner/rooms/{roomId}/images`
- `DELETE /api/partner/rooms/{roomId}/images?imageUrl=...`
- `PUT /api/partner/rooms/{roomId}/cover-image`

Request body cho `cover-image`:

```json
{
  "imageUrl": "https://... hoặc /uploads/..."
}
```

## 2.1. Luồng xử lý trong code

Nếu bạn muốn lần theo code từ ngoài vào trong, hãy đọc theo thứ tự này:

### Luồng upload

1. `PartnerController`
   Nhận request multipart từ partner.
2. `PartnerImageUploadService`
   Kiểm tra partner có sở hữu hotel/room không.
3. `ImageStorageRouterService`
   Đọc `app.uploads.provider` để chọn provider đang active.
4. `LocalImageStorageService` hoặc `CloudinaryImageStorageProvider` hoặc `S3ImageStorageProvider`
   Lưu file thật và trả về `public URL`.
5. `HotelService` hoặc `RoomService`
   Append `public URL` vào `imageUrls`, rồi tự tính `coverImageUrl` nếu cần.
6. Response trả về cho frontend
   Có cả `coverImageUrl` và `imageUrls`.

### Luồng xóa ảnh

1. `PartnerController`
   Nhận `imageUrl` cần xóa.
2. `PartnerImageUploadService`
   Kiểm tra URL này thực sự đang thuộc gallery của entity đó.
3. `ImageStorageRouterService`
   Tìm provider nào đang quản lý URL này để xóa file/object thật.
4. `HotelService` hoặc `RoomService`
   Gỡ URL khỏi `imageUrls`.
5. `resolveCoverImageUrl(...)`
   Nếu ảnh cover vừa bị xóa thì tự fallback sang ảnh đầu tiên còn lại.

### Luồng set cover

1. `PartnerController`
   Nhận JSON `{ "imageUrl": "..." }`
2. `PartnerImageUploadService`
   Chuyển tiếp xuống service domain.
3. `HotelService` hoặc `RoomService`
   Chỉ cho phép set cover nếu URL đó đã có trong gallery.
4. DB chỉ cập nhật `coverImageUrl`
   `imageUrls` giữ nguyên.

### Luồng chọn provider

- `app.uploads.provider=local`
  Upload mới đi vào local filesystem.
- `app.uploads.provider=cloudinary`
  Upload mới đi lên Cloudinary.
- `app.uploads.provider=s3`
  Upload mới đi lên S3.

Lưu ý:

- provider chỉ ảnh hưởng ảnh upload mới
- ảnh cũ vẫn giữ nguyên URL cũ trong DB
- khi delete, backend sẽ cố nhận diện URL đó thuộc provider nào để xóa đúng nơi

## 3. Bước 1: Upload ảnh thật

Mặc định project chạy với provider `local`.

### 3.1. Chạy backend

```powershell
.\mvnw.cmd spring-boot:run
```

### 3.2. Upload ảnh cho hotel

```bash
curl -X POST "http://localhost:8080/api/partner/hotels/36/images" \
  -H "Authorization: Bearer <PARTNER_JWT>" \
  -F "files=@C:/images/hotel-cover.png;type=image/png" \
  -F "files=@C:/images/hotel-lobby.jpg;type=image/jpeg"
```

Kết quả:

- backend lưu file thật vào `./uploads/hotels/36/...`
- response có `imageUrls`
- nếu hotel chưa có cover thì `coverImageUrl` tự lấy ảnh đầu tiên vừa upload

### 3.3. Upload ảnh cho room

```bash
curl -X POST "http://localhost:8080/api/partner/rooms/40/images" \
  -H "Authorization: Bearer <PARTNER_JWT>" \
  -F "files=@C:/images/room-1.png;type=image/png" \
  -F "files=@C:/images/room-2.jpg;type=image/jpeg"
```

Kết quả:

- backend lưu file thật vào `./uploads/rooms/40/...`
- response có `imageUrls`
- nếu room chưa có cover thì `coverImageUrl` tự lấy ảnh đầu tiên vừa upload

### 3.4. File type được chấp nhận

Hiện chỉ hỗ trợ:

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/gif`

## 4. Bước 2: Xóa ảnh đã upload

Xóa ảnh sẽ làm 2 việc:

- gỡ ảnh khỏi `imageUrls` trong DB
- nếu URL thuộc provider được backend quản lý thì xóa luôn file/object thật

Với provider `local`, file dưới `./uploads` sẽ bị xóa thật.

### 4.1. Xóa ảnh hotel

```bash
curl -X DELETE "http://localhost:8080/api/partner/hotels/36/images?imageUrl=%2Fuploads%2Fhotels%2F36%2Fabc.png" \
  -H "Authorization: Bearer <PARTNER_JWT>"
```

Nếu ảnh bị xóa đúng là ảnh cover hiện tại:

- backend tự chuyển `coverImageUrl` sang ảnh đầu tiên còn lại
- nếu không còn ảnh nào thì `coverImageUrl = null`

### 4.2. Xóa ảnh room

```bash
curl -X DELETE "http://localhost:8080/api/partner/rooms/40/images?imageUrl=%2Fuploads%2Frooms%2F40%2Fabc.png" \
  -H "Authorization: Bearer <PARTNER_JWT>"
```

## 5. Bước 3: Đặt ảnh cover riêng

Chỉ được set cover bằng một URL đã có sẵn trong gallery hiện tại.

### 5.1. Set cover cho hotel

```bash
curl -X PUT "http://localhost:8080/api/partner/hotels/36/cover-image" \
  -H "Authorization: Bearer <PARTNER_JWT>" \
  -H "Content-Type: application/json" \
  -d "{\"imageUrl\":\"/uploads/hotels/36/lobby.png\"}"
```

### 5.2. Set cover cho room

```bash
curl -X PUT "http://localhost:8080/api/partner/rooms/40/cover-image" \
  -H "Authorization: Bearer <PARTNER_JWT>" \
  -H "Content-Type: application/json" \
  -d "{\"imageUrl\":\"/uploads/rooms/40/bed.png\"}"
```

Nếu gửi một URL không nằm trong gallery, backend trả `400 VALIDATION_ERROR`.

## 6. Bước 4: Chuyển storage provider

Storage active được chọn bằng:

```yaml
app:
  uploads:
    provider: local | cloudinary | s3
```

### 6.1. Provider local

```yaml
app:
  uploads:
    provider: local
    storage-root: ./uploads
    public-base-path: /uploads
```

Đây là mode phù hợp nhất để demo local nhanh.

### 6.2. Provider Cloudinary

Config:

```powershell
$env:UPLOAD_PROVIDER="cloudinary"
$env:UPLOAD_CLOUDINARY_ENABLED="true"
$env:UPLOAD_CLOUDINARY_CLOUD_NAME="your-cloud-name"
$env:UPLOAD_CLOUDINARY_API_KEY="your-api-key"
$env:UPLOAD_CLOUDINARY_API_SECRET="your-api-secret"
$env:UPLOAD_CLOUDINARY_FOLDER_PREFIX="hotel-backend"
.\mvnw.cmd spring-boot:run
```

Khi đó:

- upload mới sẽ đi lên Cloudinary
- response trả `secure_url` của Cloudinary
- delete ảnh sẽ gọi Cloudinary destroy nếu URL thuộc Cloudinary

### 6.3. Provider S3

Config:

```powershell
$env:UPLOAD_PROVIDER="s3"
$env:UPLOAD_S3_ENABLED="true"
$env:UPLOAD_S3_BUCKET="your-bucket"
$env:UPLOAD_S3_REGION="ap-southeast-1"
$env:UPLOAD_S3_ACCESS_KEY="your-access-key"
$env:UPLOAD_S3_SECRET_KEY="your-secret-key"
$env:UPLOAD_S3_KEY_PREFIX="hotel-backend"
.\mvnw.cmd spring-boot:run
```

Tùy chọn nếu bạn đã có CDN/domain public riêng:

```powershell
$env:UPLOAD_S3_PUBLIC_BASE_URL="https://cdn.example.com"
```

Lưu ý quan trọng với S3:

- backend hiện lưu `public URL`, không tạo `pre-signed URL`
- bucket hoặc CDN phải được cấu hình public-read đúng cách để frontend đọc ảnh
- nếu không có `UPLOAD_S3_PUBLIC_BASE_URL`, backend sẽ build URL mặc định theo S3 SDK

## 7. Public API cho người dùng cuối

Các API công khai đã trả ảnh và cover:

- `GET /api/hotels/search`
- `GET /api/hotels/{id}`
- `GET /api/hotels/{id}/available-rooms`

Ví dụ response search:

```json
{
  "hotelId": 36,
  "name": "Catalog Resort",
  "coverImageUrl": "/uploads/hotels/36/cover.png",
  "imageUrls": [
    "/uploads/hotels/36/cover.png",
    "/uploads/hotels/36/lobby.png"
  ]
}
```

## 8. Lưu ý vận hành

- Đổi provider chỉ ảnh hưởng upload mới; dữ liệu cũ vẫn giữ nguyên URL cũ trong DB.
- Delete sẽ cố xóa file/object thật nếu URL thuộc một provider backend nhận ra.
- Nếu bạn đang demo local, nên giữ `UPLOAD_PROVIDER=local`.
- Nếu bạn muốn production-like hơn, ưu tiên `Cloudinary` cho demo nhanh; `S3` phù hợp khi bạn đã có bucket policy hoặc CDN ổn định.

## 9. Verify đã chạy

Các test đã được bổ sung cho:

- upload ảnh hotel/room
- set cover riêng
- delete ảnh và fallback cover
- public response có `coverImageUrl`

Command verify:

```powershell
.\mvnw.cmd "-Dtest=PartnerHotelRoomIntegrationTest,HotelDetailIntegrationTest,HotelSearchIntegrationTest" test
.\mvnw.cmd test
```
