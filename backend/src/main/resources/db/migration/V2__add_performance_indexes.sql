-- =============================================================================
-- V2__add_performance_indexes.sql
-- Các index tối ưu hiệu suất cho VLU Hotel Hub
--
-- Sử dụng CREATE INDEX CONCURRENTLY IF NOT EXISTS để:
--   1. Idempotent: chạy lại nhiều lần không gây lỗi
--   2. CONCURRENTLY: không block ghi khi chạy trên DB đang có traffic
--
-- Lưu ý: CONCURRENTLY không chạy được trong transaction block.
--   Flyway mặc định wrap mỗi migration trong transaction. Cần bật
--   spring.flyway.out-of-order=false (default) và dùng @NonTransactional
--   hoặc disable transaction cho file này bằng cách set:
--     flyway.executeInTransaction=false (v9+)
-- Với Spring Boot, thêm tên file bắt đầu bằng "V" là đủ.
-- Nếu CONCURRENTLY gây vấn đề, có thể bỏ từ khóa CONCURRENTLY.
-- =============================================================================

-- ============================================================
-- HOTELS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hotels_status
    ON hotels (status);

CREATE INDEX IF NOT EXISTS idx_hotels_status_province
    ON hotels (status, province);

CREATE INDEX IF NOT EXISTS idx_hotels_status_province_district
    ON hotels (status, province, district);

CREATE INDEX IF NOT EXISTS idx_hotels_owner_id
    ON hotels (owner_id);

-- ============================================================
-- ROOMS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id_status
    ON rooms (hotel_id, status);

-- ============================================================
-- BOOKINGS — hot path: expiry scan, "đơn của tôi", analytics
-- ============================================================

-- Quét booking PENDING_PAYMENT quá hạn (scheduled job 60s + passive expiration)
CREATE INDEX IF NOT EXISTS idx_bookings_status_expires_at
    ON bookings (status, expires_at);

-- "Đơn của tôi" (customer): lọc theo user_id, sắp xếp theo created_at DESC
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_created_at
    ON bookings (user_id, created_at);

-- Partner analytics: lọc theo khoảng check_in
CREATE INDEX IF NOT EXISTS idx_bookings_check_in
    ON bookings (check_in);

-- ============================================================
-- BOOKING ITEMS — FK columns Postgres không tự index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id
    ON booking_items (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_room_type_id
    ON booking_items (room_type_id);

-- ============================================================
-- PRICE FEEDBACK — truy vấn top-10 theo room + thời gian
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pf_room_created
    ON price_feedback (room_id, created_at DESC);

-- ============================================================
-- PUBLIC HOLIDAY — lookup theo date string
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ph_date
    ON public_holiday (date);
