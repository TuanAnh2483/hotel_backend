package com.hotel.hotel_backend.dto.response;

public record RoomResponse(
        Long id,
        String name,
        Integer capacity,
        Integer quantity,
        Long price,
        Long hotelId
) {}