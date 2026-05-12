package com.hotel.hotel_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "public_holiday", indexes = {
        @Index(name = "idx_ph_date", columnList = "date")
})
@Getter
@Setter
@NoArgsConstructor
public class PublicHoliday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ISO date string, e.g. "2026-04-30" */
    @Column(nullable = false, unique = true, length = 10)
    private String date;

    @Column(nullable = false, length = 120)
    private String name;

    /** MAJOR or MINOR */
    @Column(nullable = false, length = 10)
    private String tier;
}
