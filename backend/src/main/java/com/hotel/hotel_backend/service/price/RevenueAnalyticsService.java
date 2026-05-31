package com.hotel.hotel_backend.service.price;


import com.hotel.hotel_backend.dto.response.RevenueAnalyticsResponse;
import com.hotel.hotel_backend.entity.BookingItem;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.repository.BookingItemRepository;
import com.hotel.hotel_backend.repository.PriceFeedbackRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RevenueAnalyticsService {

    private final RoomRepository roomRepository;
    private final BookingItemRepository bookingItemRepository;
    private final PriceFeedbackRepository feedbackRepository;
    private final SecurityService securityService;

    @Transactional(readOnly = true)
    public RevenueAnalyticsResponse getAnalytics(Long roomId) {
        Long ownerId = securityService.getCurrentPrincipal().userId();

        Room room = roomRepository.findByIdAndHotelOwnerId(roomId,ownerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND,"Room not found"));

        LocalDate toDay = LocalDate.now();
        LocalDate from28 = LocalDate.now().minusDays(28);

        // Revenue: load booking items cho 28 ngày qua
        List<BookingItem> items = bookingItemRepository.findActiveByRoomAndCheckInRange(roomId, from28, toDay);

        LocalDate d7 = toDay.minusDays(7);
        LocalDate d14 = toDay.minusDays(14);

        long revenue28Days = sumRevenue(items, from28,toDay);  // Doanh thu 28 ngày qua
        long revenue7Days  = sumRevenue(items, d7,toDay);              // Doanh thu 7 ngày qua
        long revPrev7Days  = sumRevenue(items, d14, d7);          // Doanh thu 7 ngày trước đó (để tính growth)

        double growthPct   = revPrev7Days > 0  // điều kiện
                ? ((double)(revenue7Days - revPrev7Days) / revPrev7Days) * 100  // nếu đúng tính phần trăm tăng trưởng
                : 0.0; // nếu revPrev7Days = 0 (ví dụ mới mở bán), tránh chia 0 → mặc định growth = 0%

        LocalDateTime feedbackSince = from28.atStartOfDay();   // Đếm số feedback của phòng này trong 28 ngày qua, phân loại theo outcome để tính acceptance rate và cung cấp insight cho partner
        int total    = (int) feedbackRepository.countByRoomIdAndCreatedAtAfter(roomId, feedbackSince); // Tổng số feedback trong 28 ngày qua (dùng để tính tỉ lệ và đánh giá có đủ data để train không)
        int applied  = (int) feedbackRepository.countByRoomIdAndOutcomeAndCreatedAtAfter(roomId, "APPLIED", feedbackSince);   // Số feedback partner đã áp dụng giá đề xuất (APPLIED) trong 28 ngày qua
        int minus5   = (int) feedbackRepository.countByRoomIdAndOutcomeAndCreatedAtAfter(roomId, "APPLIED_MINUS5", feedbackSince);   // Số feedback partner đã áp dụng giá đề xuất nhưng giảm 5% (APPLIED_MINUS5) trong 28 ngày qua
        int skipped  = (int) feedbackRepository.countByRoomIdAndOutcomeAndCreatedAtAfter(roomId, "SKIPPED", feedbackSince);      // Số feedback partner bỏ qua đề xuất (SKIPPED) trong 28 ngày qua
        double rate  = total > 0 ? ((double)(applied + minus5) / total) * 100 : 0.0;

        // Weekly breakdown: 4 tuần, từ cũ → mới
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM"); // định dạng label tuần
        List <RevenueAnalyticsResponse.WeekStat> weeks = new ArrayList<>();
        for (int w = 3; w >= 0; w--) { // 1 tháng 4 tuần w=3
            // Giả sử toDay là cuối ngày hôm nay
            // w=0: Start = hôm nay - 7 ngày, End = hôm nay
            LocalDate wStart = toDay.minusDays(7L * (w + 1));
            LocalDate wEnd = toDay.minusDays(7L * w);

            // label: Định dạng ngày để hiển thị (ví dụ: 01/01 - 07/01)
            String label = wStart.format(fmt) + " - " + wEnd.minusDays(1).format(fmt);

            // wRevenue: Gọi hàm tính tổng doanh thu trong khoảng (wStart -> wEnd)
            long wRevenue = sumRevenue(items, wStart, wEnd);

            // wBookings: Đếm số lượng Booking ID duy nhất (distinct) bằng Stream API
            int wBookings = (int) items.stream()
                    .filter(bi -> {         // lọc theo booking có ngày check in trong khoảng
                        LocalDate ci = bi.getBooking().getCheckIn(); // Doanh thu được tính theo ngày check-in
                        // Logic: wStart <= checkIn < wEnd
                        return !ci.isBefore(wStart) && ci.isBefore(wEnd);
                    })
                    .map(bi -> bi.getBooking().getId()) // Lấy ID của Booking
                    .distinct()                         // Loại bỏ trùng lặp (1 booking có nhiều item)
                    .count();                           // Đếm

            weeks.add(new RevenueAnalyticsResponse.WeekStat(label, wRevenue, wBookings));
        }

        return new RevenueAnalyticsResponse( roomId, room.getName(),revenue28Days, revenue7Days, revPrev7Days, growthPct,
                total, applied, minus5, skipped, rate,
                weeks);
    }
    private long sumRevenue(
            List<BookingItem> items,
            LocalDate from,
            LocalDate to
    ) {
        return items.stream()
                .filter(bi -> {
                    LocalDate ci = bi.getBooking().getCheckIn();
                    return !ci.isBefore(from) && ci.isBefore(to);
                })
                .mapToLong(bi ->
                        Math.round(bi.getPrice() * bi.getQuantity()))
                .sum(); // Tổng doanh thu = sum(price * quantity) của các booking item có check-in trong khoảng thời gian phân tích
    }
}

