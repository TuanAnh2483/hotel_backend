package com.hotel.hotel_backend.dto.response;

import java.time.LocalDateTime;

public record PricingModelResponse(
        Long   roomId,
        int    trainingRound,
        int    trainingDataPoints,
        boolean hasSufficientData,
        double priceAggressiveness,
        double partnerPriceAdjustment,
        double lastAcceptanceRate,
        double weekdayBoost,
        double weekendBoost,
        Double avgWeekdayOcc,
        Double avgWeekendOcc,
        LocalDateTime lastTrainedAt,
        boolean lrReady,
        int    lrTrainingSamples,
        double lrLastLoss
) {}
