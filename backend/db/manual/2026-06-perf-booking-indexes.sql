-- Performance indexes cho bảng bookings / booking_items
-- =====================================================================
-- Vì project chạy ddl-auto=validate ở production và KHÔNG dùng Flyway/Liquibase,
-- các @Index khai báo trong entity (Booking.java, BookingItem.java) sẽ KHÔNG được
-- Hibernate tạo tự động khi validate. Chạy file này MỘT LẦN trực tiếp lên DB Postgres.
--
-- Cách chạy:
--   psql "$DATABASE_URL" -f 2026-06-perf-booking-indexes.sql
--
-- Ghi chú: CREATE INDEX CONCURRENTLY không chạy được trong transaction block.
--   - psql chạy mỗi statement tự-commit (autocommit) nên file này ổn.
--   - Nếu DB đang có tải, CONCURRENTLY tránh khoá ghi bảng. Trên DB rảnh/dev có thể
--     bỏ CONCURRENTLY cho nhanh.
-- =====================================================================

-- Quét booking PENDING_PAYMENT quá hạn (scheduled job 60s + passive expiration).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_expires_at
    ON bookings (status, expires_at);

-- "Đơn của tôi" (customer): lọc theo user_id, sắp xếp theo created_at DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id_created_at
    ON bookings (user_id, created_at);

-- Partner summary/analytics: lọc theo khoảng check_in.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_check_in
    ON bookings (check_in);

-- FK columns của booking_items (Postgres không tự index FK) — cần cho join
-- booking → items → room và cho release inventory (findByBookingId).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_items_booking_id
    ON booking_items (booking_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_items_room_type_id
    ON booking_items (room_type_id);
