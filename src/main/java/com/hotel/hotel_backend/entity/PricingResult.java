package com.hotel.hotel_backend.entity;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PricingResult {

    private Long suggestedPrice;

    private Long priceLow;

    private Long priceHigh;

    private double deltaPct;
}