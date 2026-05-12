package com.hotel.hotel_backend.dto.response;

import java.util.List;

public record RevenueAnalyticsResponse(
        Long roomId,
        String roomName,

        // Doanh thu
        long revenue28Days,
        long revenue7Days,
        long revenuePrev7Days,
        double weeklyGrowthPct,

        // AI feedback stats
        int feedbackTotal,
        int appliedCount,
        int appliedMinus5Count,
        int skippedCount,
        double acceptanceRate,

        // Xu hướng 4 tuần gần nhất (cũ → mới)
        List<WeekStat> weeklyRevenue
) {
    public record WeekStat(
            String label,       // "dd/MM–dd/MM"
            long revenue,
            int bookingCount
    ) {
    }
}
