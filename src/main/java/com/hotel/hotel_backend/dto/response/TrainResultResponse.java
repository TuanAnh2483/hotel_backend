package com.hotel.hotel_backend.dto.response;

import java.time.LocalDateTime;

public record TrainResultResponse(
        boolean hasSufficientData,
        int trainingRound,
        int trainingDataPoints,
        double priceAggressiveness,
        double lastAcceptanceRate,
        LocalDateTime lastTrainedAt
) {}
