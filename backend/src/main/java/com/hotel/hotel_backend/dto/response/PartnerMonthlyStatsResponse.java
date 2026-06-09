package com.hotel.hotel_backend.dto.response;

import java.util.List;

/**
 * Thống kê theo tháng cho tab Thống kê của partner. Aggregate sẵn ở server để
 * frontend không phải kéo toàn bộ booking cả năm về rồi tự cộng.
 *
 * Quy ước (bám theo UI cũ): revenue (tổng + theo tháng) loại bỏ booking CANCELLED;
 * confirmedBookings gồm CONFIRMED + COMPLETED; totalBookings đếm tất cả trạng thái.
 */
public record PartnerMonthlyStatsResponse(
        int year,
        long totalRevenue,
        long totalBookings,
        long confirmedBookings,
        long cancelledBookings,
        List<MonthlyBucket> months
) {
    /** Một tháng: month = 1..12. revenue/count đã loại CANCELLED. */
    public record MonthlyBucket(int month, long revenue, long count) {}
}
