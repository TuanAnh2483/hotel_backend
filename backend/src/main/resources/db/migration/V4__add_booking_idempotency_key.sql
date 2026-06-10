-- =============================================================================
-- V4__add_booking_idempotency_key.sql
-- Thêm idempotency key vào bookings để ngăn double-booking khi client retry
-- =============================================================================

ALTER TABLE bookings
    ADD COLUMN idempotency_key VARCHAR(64) NULL UNIQUE;

-- Partial index: chỉ index row có key thực sự (bỏ qua NULL) — compact và nhanh hơn
CREATE INDEX idx_bookings_idempotency_key
    ON bookings (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
