package com.hotel.hotel_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDate;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class DailyInventoryId implements Serializable {

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "date")
    private LocalDate date;
}