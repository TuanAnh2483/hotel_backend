package com.hotel.hotel_backend.dto.response;

import java.time.LocalDate;

public record PartnerRoomCalendarDayResponse(
        LocalDate date,
        Long price,
        Integer minStay,
        Boolean closed,
        Integer availableRooms,
        Integer blockedRooms,
        Integer sellableRooms,
        Boolean hasCustomRate,
        Boolean hasInventoryRow
) {}
