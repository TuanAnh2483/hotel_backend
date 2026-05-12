package com.hotel.hotel_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "price_feedback", indexes = { // Tạo index để tối ưu truy vấn theo roomId và createdAt (phân trang theo thời gian)
        @Index(name = "idx_pf_room_created", columnList = "roomId, createdAt DESC")
})
@Getter
@Setter
@NoArgsConstructor  // Lombok sẽ tạo constructor mặc định (không tham số) cho JPA
public class PriceFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // PK tự động tăng

    @Column(nullable = false)
    private Long roomId; // FK → phòng nào

    @Column(nullable = false)
    private String date;             // "YYYY-MM-DD"

    @Column(nullable = false)
    private Long suggestedPrice;      // giá AI đề xuất

    private Long appliedPrice;       // giá thực tế áp dụng (null nếu SKIPPED)

    @Column(nullable = false)
    private String outcome;          // APPLIED | APPLIED_MINUS5 | SKIPPED

    @Column(nullable = false)
    private Long partnerId;

    @Column
    private Double competitorPrice; // giá đối thủ tại thời điểm đó

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        createdAt = now;
    }
}

