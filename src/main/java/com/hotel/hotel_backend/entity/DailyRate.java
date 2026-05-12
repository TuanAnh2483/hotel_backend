package com.hotel.hotel_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;


@Entity
@Table(name="daily_rates")
@Getter @Setter
public class DailyRate {

    @EmbeddedId
    private DailyRateId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId")
    @JoinColumn(name= "room_id", nullable = false)
    private Room room;


    @Column(name="price", nullable = false)
    private Long price;

    @Column(name ="min_stay")
    private Integer minStay;

    @Column(name = "is_closed", nullable = false)
    private boolean  isClosed;

}
