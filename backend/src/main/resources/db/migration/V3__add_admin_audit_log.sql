-- =============================================================================
-- V3__add_admin_audit_log.sql
-- Audit trail cho hành động của admin
-- =============================================================================

CREATE TABLE admin_audit_logs (
    id          BIGSERIAL    PRIMARY KEY,
    admin_id    BIGINT       NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id   BIGINT,
    detail      VARCHAR(500),
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP    NOT NULL
);

CREATE INDEX idx_audit_admin_id   ON admin_audit_logs (admin_id);
CREATE INDEX idx_audit_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX idx_audit_target     ON admin_audit_logs (target_type, target_id);
