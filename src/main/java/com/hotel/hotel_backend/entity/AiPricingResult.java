package com.hotel.hotel_backend.entity;

import java.util.List;

public record AiPricingResult(
        Long suggestedPrice,
        Long priceLow,
        Long priceHigh,
        String reason,
        List<String> factors,
        boolean aiGenerated
) {}
