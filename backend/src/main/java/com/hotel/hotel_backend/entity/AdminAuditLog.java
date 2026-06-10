package com.hotel.hotel_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Audit trail cho mọi hành động của admin.
 * Mỗi mutation (xoá hotel, ban user, duyệt partner...) tạo 1 record ở đây.
 * Đọc-only sau khi tạo — không có @PreUpdate.
 */
@Entity
@Table(
    name = "admin_audit_logs",
    indexes = {
        @Index(name = "idx_audit_admin_id",    columnList = "admin_id"),
        @Index(name = "idx_audit_created_at",  columnList = "created_at"),
        @Index(name = "idx_audit_target",      columnList = "target_type, target_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID của admin đã thực hiện action */
    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    /**
     * Tên action, dùng SCREAMING_SNAKE_CASE.
     * Ví dụ: TOGGLE_USER_STATUS, DELETE_HOTEL, APPROVE_PARTNER, DELETE_REVIEW
     */
    @Column(name = "action", nullable = false, length = 100)
    private String action;

    /** Loại object bị tác động: USER, HOTEL, REVIEW, PARTNER_APPLICATION, REFUND */
    @Column(name = "target_type", length = 50)
    private String targetType;

    /** ID của object bị tác động */
    @Column(name = "target_id")
    private Long targetId;

    /** Mô tả ngắn kết quả hoặc thay đổi (nullable) */
    @Column(name = "detail", length = 500)
    private String detail;

    /** IP của admin gọi API (lấy từ X-Forwarded-For hoặc RemoteAddr) */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
