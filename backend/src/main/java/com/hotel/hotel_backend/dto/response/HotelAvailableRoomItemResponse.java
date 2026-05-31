package com.hotel.hotel_backend.dto.response;

import java.util.List;
import java.util.Set;

public record HotelAvailableRoomItemResponse(
        Long roomId,
        String name,
        String coverImageUrl,
        List<String> imageUrls,
        Integer capacity,
        Integer availableUnits,
        Long stayPrice,         // total for stay
        String description,
        String roomCategory,
        String bedType,
        Set<String> amenities,
        Set<String> customAmenities
) {
}
