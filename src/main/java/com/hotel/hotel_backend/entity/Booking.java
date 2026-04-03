package com.hotel.hotel_backend.entity;


import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
    // ID của booking
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ID user đặt phòng (customer_id trong DB)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ngày checkin
    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    // ngày checkout
    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    // tổng tiền booking
    @Column(name = "total_price", nullable = false)
    private Double totalPrice;

    // trạng thái booking
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;
    // Tao contact
    @JsonManagedReference
    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL)
    private BookingContact contact;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
