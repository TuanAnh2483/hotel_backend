package com.hotel.hotel_backend.service.price;

import org.springframework.stereotype.Component;

@Component
public class PricingPolicy {

    // =====================================================
    // DEMAND
    // =====================================================

    public double getBaseDemandFactor() {
        return 0.93;
    }

    public double getOccupancyWeight() {
        return 0.25;
    }

    // =====================================================
    // WEEKEND
    // =====================================================

    public double getWeekendMultiplier() {
        return 1.08;
    }

    // =====================================================
    // HOLIDAY
    // =====================================================

    public double getMajorHolidayMultiplier() {
        return 1.30;
    }

    public double getMinorHolidayMultiplier() {
        return 1.10;
    }

    // =====================================================
    // PRICE RANGE
    // =====================================================

    public double getLowPriceRatio() {
        return 0.92;
    }

    public double getHighPriceRatio() {
        return 1.08;
    }
}