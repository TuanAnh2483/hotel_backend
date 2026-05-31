package com.hotel.hotel_backend.entity;


import jakarta.persistence.*;
import lombok.Data;

import static com.hotel.hotel_backend.entity.PropertyStatus.*;

@Entity
@Table(name="property")
@Data
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="name")
    private String name;
    @Column(name="address")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name  ="status")
    private PropertyStatus status= DRAFT;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    private User owner;

}

