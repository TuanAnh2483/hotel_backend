package com.hotel.hotel_backend.dto;

public record PriceSuggestionDraft(
        DailyPriceFeature feature,
        Long suggestedPrice,
        Long priceLow,
        Long priceHigh,
        double deltaPct
) {}
