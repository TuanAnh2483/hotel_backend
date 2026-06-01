package com.hotel.hotel_backend.dto.response;

import java.time.LocalDate;
import java.util.List;

public record PartnerRoomCalendarResponse(
        Long roomId,
        String roomName,
        Long hotelId,
        Long basePrice,
        Integer defaultQuantity,
        LocalDate from,
        LocalDate to,
        List<PartnerRoomCalendarDayResponse> items
) {}
