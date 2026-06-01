package com.hotel.hotel_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", length = 120)
    private String fullName;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(length = 30)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 2000)
    private String bio;

    @Column(name = "avatar_url", length = 2000)
    private String avatarUrl;

    @Column(name = "brand_name", length = 160)
    private String brandName;

    @Column(name = "tax_code", length = 50)
    private String taxCode;

    @Column(name = "representative_name", length = 120)
    private String representativeName;

    @Column(name = "business_type", length = 120)
    private String businessType;

    @Column(name = "founded_date")
    private LocalDate foundedDate;

    @Column(length = 255)
    private String website;

    @Column(name = "login_alert_enabled", nullable = false)
    private boolean loginAlertEnabled = true;

    @Column(name = "booking_update_enabled", nullable = false)
    private boolean bookingUpdateEnabled = true;

    @Column(name = "password_changed_at")
    private OffsetDateTime passwordChangedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (passwordChangedAt == null) {
            passwordChangedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
