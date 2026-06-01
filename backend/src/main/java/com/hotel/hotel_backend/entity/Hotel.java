package com.hotel.hotel_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "hotels")
@Getter
@Setter
public class  Hotel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @OneToMany(mappedBy = "hotel")
    private List<Room> rooms;         /// table rooms

    @Column(nullable = false)
    private String name;

    @Column(length = 500)
    private String address;
    private String province;
    private String district;
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HotelType hotelType = HotelType.HOTEL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) not null default 'BY_ROOM'")
    private BookingMode bookingMode = BookingMode.BY_ROOM;

    @ElementCollection(targetClass = HotelAmenity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "hotel_amenities", joinColumns = @JoinColumn(name = "hotel_id"))
    @Column(name = "amenity", nullable = false)
    @Enumerated(EnumType.STRING)
    private Set<HotelAmenity> amenities = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hotel_custom_amenities", joinColumns = @JoinColumn(name = "hotel_id"))
    @Column(name = "amenity", nullable = false, length = 100)
    private Set<String> customAmenities = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hotel_images", joinColumns = @JoinColumn(name = "hotel_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "image_url", nullable = false, length = 1000)
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;


    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer ratingCount = 0;

    @Enumerated(EnumType.STRING)
    private HotelStatus status = HotelStatus.ACTIVE;

    private OffsetDateTime createdAt;
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




