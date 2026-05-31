package com.hotel.hotel_backend.dto;

import java.util.List;

public record PriceExplanation(
        String reason,
        List<String> factors,
        boolean aiGenerated
) {}
