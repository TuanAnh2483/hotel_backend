package com.hotel.hotel_backend.entity;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PricingContext {

    private String isoDate;

    private long basePrice;

    private long currentPrice;

    private boolean weekend;

    private boolean holiday;

    private String holidayTier;

    private double occupancy;
}