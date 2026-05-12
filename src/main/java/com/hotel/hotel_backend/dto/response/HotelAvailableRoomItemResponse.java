package com.hotel.hotel_backend.dto.response;


import java.util.List;

public record HotelAvailableRoomItemResponse(
        Long roomId,
        String name,
        String coverImageUrl,
        List<String> imageUrls,
        Integer capacity,
        Integer availableUnits,
        Long stayPrice    // total for stay
) {
}
