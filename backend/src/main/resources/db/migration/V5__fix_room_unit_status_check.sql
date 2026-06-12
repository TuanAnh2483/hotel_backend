-- =============================================================================
-- V5__fix_room_unit_status_check.sql
-- Sửa lỗi 500 khi đổi trạng thái phòng sang RESERVED ("Có người đặt").
--
-- Nguyên nhân: trên DB production, bảng room_units từng được Hibernate
-- (ddl-auto=update) tự tạo kèm một CHECK constraint liệt kê các giá trị enum
-- RoomUnitStatus tại thời điểm đó. Giá trị RESERVED được thêm vào enum sau này
-- nên constraint cũ không cho phép -> DataIntegrityViolationException -> 500.
--
-- Migration này gỡ bỏ mọi CHECK constraint cũ trên cột status của room_units
-- rồi tạo lại constraint chuẩn bao gồm đủ 5 trạng thái. An toàn cho cả DB mới
-- (cột status do V1 tạo, vốn không có CHECK) lẫn DB cũ (có constraint lệch).
-- =============================================================================

DO $$
DECLARE
    cons RECORD;
BEGIN
    FOR cons IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel      ON rel.oid = con.conrelid
        JOIN pg_namespace nsp  ON nsp.oid = rel.relnamespace
        WHERE con.contype = 'c'
          AND rel.relname = 'room_units'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE room_units DROP CONSTRAINT %I', cons.conname);
    END LOOP;
END $$;

ALTER TABLE room_units
    ADD CONSTRAINT room_units_status_check
    CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'CLEANING'));
