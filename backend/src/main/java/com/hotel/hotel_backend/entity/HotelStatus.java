package com.hotel.hotel_backend.entity;

import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;


public enum HotelStatus {
    ACTIVE,
    INACTIVE,
    BLOCKED
}
