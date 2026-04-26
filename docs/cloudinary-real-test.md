# Cloudinary Real Integration Test

Mục tiêu của test này là chạy upload thật lên Cloudinary từ backend local, không mock storage provider.

## Điều kiện

- Có tài khoản Cloudinary thật
- Máy local có Internet
- Có đủ các biến môi trường:

```powershell
$env:RUN_CLOUDINARY_IT="true"
$env:UPLOAD_CLOUDINARY_CLOUD_NAME="your-cloud-name"
$env:UPLOAD_CLOUDINARY_API_KEY="your-api-key"
$env:UPLOAD_CLOUDINARY_API_SECRET="your-api-secret"
$env:UPLOAD_CLOUDINARY_FOLDER_PREFIX="hotel-backend-real-test"
```

## Cách chạy

Chạy đúng test class real integration:

```powershell
.\mvnw -Dtest=PartnerCloudinaryRealIntegrationTest test
```

## Test này làm gì

- Boot app test với `provider=cloudinary`
- Upload ảnh PNG thật cho hotel
- Kiểm tra URL trả về là URL Cloudinary thật
- Gọi URL public đó qua HTTP để xác nhận asset đã được deliver thật
- Set cover và delete ảnh hotel qua API hiện tại
- Upload ảnh thật cho room
- Sau mỗi test, backend sẽ tự gọi delete để dọn asset Cloudinary đã tạo

## Lưu ý

- Test chỉ chạy khi `RUN_CLOUDINARY_IT=true`
- Nếu thiếu credential, test sẽ bị skip
- Folder mặc định trên Cloudinary là `hotel-backend-real-test/...`
- Test local hiện tại dùng provider `local` vẫn giữ nguyên, không bị thay đổi
