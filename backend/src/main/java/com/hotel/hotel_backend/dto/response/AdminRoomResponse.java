package com.hotel.hotel_backend.dto.response;

import com.hotel.hotel_backend.entity.BedType;
import com.hotel.hotel_backend.entity.RoomAmenity;
import com.hotel.hotel_backend.entity.RoomCategory;
import com.hotel.hotel_backend.entity.RoomStatus;

import java.util.Set;

public record AdminRoomResponse(
        Long id,
        String name,
        Long price,
        Integer capacity,
        Integer quantity,
        RoomCategory roomCategory,
        BedType bedType,
        RoomStatus status,
        Set<RoomAmenity> amenities,
        Set<String> customAmenities
) {}
