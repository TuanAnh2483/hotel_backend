package com.hotel.hotel_backend.service.price.util;

import java.time.LocalDate;

public class PricingUtils {
    public static long roundK(double v) {
        return Math.round(v / 1000) * 1000L;
    }   // làm tròn đơn vị

    public static String getDemand(double occ) {    // Dựa trên occupancy để đánh giá mức độ nhu cầu, từ đó điều chỉnh độ tích cực của giá đề xuất (demandFactor) cho phù hợp với từng ngày  //Phân loại nhu cầu khách hàng
        if (occ * 100 >= 85) return "HIGH";
        if (occ * 100 >= 60) return "MEDIUM";
        return "LOW";
    }

    public static String computeConfidence(int count, int daysUntil) {
        if (count >= 30 && daysUntil <= 14) return "HIGH";
        if (count >= 10 && daysUntil <= 21) return "MEDIUM";
        return "LOW";
    }

    public static String dayName(LocalDate d) { // Chuyển ngày trong tuần sang tên tiếng Việt để hiển thị ở frontend, ví dụ "Th 2", "T7", "CN"
        return switch (d.getDayOfWeek()) {
            case MONDAY    -> "Th 2";
            case TUESDAY   -> "Th 3";
            case WEDNESDAY -> "Th 4";
            case THURSDAY  -> "Th 5";
            case FRIDAY    -> "Th 6";
            case SATURDAY  -> "T7";
            case SUNDAY    -> "CN";
        };
    }
}
