package com.hotel.hotel_backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PriceSuggestionResponse(
        Long   roomId,
        String roomName,
        Long   hotelId,
        long   basePrice,
        List<PriceSuggestionItem> items,
        int           trainingRound,
        int           trainingDataPoints,
        double        priceAggressiveness,
        double        lastAcceptanceRate,
        boolean       hasSufficientData,
        LocalDateTime lastTrainedAt
) {}