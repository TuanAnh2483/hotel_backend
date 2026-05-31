package com.hotel.hotel_backend.dto.response;

/** Tóm tắt số lượng units gắn kèm vào RoomResponse (không trả full list). */
public record RoomUnitSummaryResponse(
        long totalUnits,
        long availableUnits,
        long occupiedUnits,
        long maintenanceUnits,
        long cleaningUnits
) {}
