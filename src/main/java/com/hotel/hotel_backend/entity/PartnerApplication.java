package com.hotel.hotel_backend.entity;


import jakarta.persistence.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Entity
@Table(name = "partner_application")
@Data
public class PartnerApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="user_id",referencedColumnName = "id")
    private User user;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name ="bussiness_name")
    private String bussinessName;

    @Column(name="phone")
    private String phoneNumber;

    @Column(name="tax_code")
    private String tax_code;

    @Column(name = "verification_status")
    private String verification_status;

    @Enumerated(EnumType.STRING)
    @Column(name="status")
    private PartnerApplicationStatus status;

    @Column(name = "reject_reason")
    private String rejectReason;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        var now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
