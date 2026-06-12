package com.hotel.hotel_backend.service.chat;

import com.hotel.hotel_backend.dto.request.PartnerReviewReplyRequest;
import com.hotel.hotel_backend.dto.request.PartnerReviewSearchRequest;
import com.hotel.hotel_backend.dto.response.HotelReviewResponse;
import com.hotel.hotel_backend.dto.response.PartnerBookingDetailResponse;
import com.hotel.hotel_backend.dto.response.PartnerMonthlyStatsResponse;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.entity.RoomStatus;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.service.HotelReviewService;
import com.hotel.hotel_backend.service.PartnerBookingService;
import com.hotel.hotel_backend.service.PartnerRoomCalendarService;
import com.hotel.hotel_backend.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asDate;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asInt;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asLong;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asString;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.obj;

/**
 * Thực thi 4 partner tool. ownerId LUÔN lấy từ JWT ({@link SecurityService}), không nhận từ client.
 * Tái dùng {@link PartnerBookingService}, {@link PartnerRoomCalendarService} và các repository.
 */
@Service
@RequiredArgsConstructor
public class PartnerToolService {

    private static final int MAX_RANGE_DAYS = 31;
    private static final int MAX_ROOMS = 20;
    private static final int MAX_CHECKINS = 50;

    private final SecurityService securityService;
    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final DailyInventoryRepository dailyInventoryRepository;
    private final BookingRepository bookingRepository;
    private final PartnerBookingService partnerBookingService;
    private final PartnerRoomCalendarService partnerRoomCalendarService;
    private final HotelReviewService hotelReviewService;

    @Transactional
    public Map<String, Object> execute(String name, Map<String, Object> args) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        return switch (name) {
            case "get_available_rooms" -> availableRooms(ownerId, args);
            case "get_revenue_stats" -> revenueStats(args);
            case "get_upcoming_checkins" -> upcomingCheckins(ownerId, args);
            case "block_room" -> blockRoom(args);
            case "set_room_price" -> setRoomPrice(args);
            case "get_occupancy_rate" -> occupancyRate(ownerId, args);
            case "get_recent_reviews" -> recentReviews(args);
            case "get_booking_detail" -> bookingDetail(args);
            case "get_today_overview" -> todayOverview(ownerId);
            case "get_revenue_trend" -> revenueTrend(args);
            case "reply_to_review" -> replyToReview(args);
            default -> obj("error", "Tool không tồn tại: " + name);
        };
    }

    private Map<String, Object> availableRooms(long ownerId, Map<String, Object> args) {
        LocalDate from = asDate(args, "dateFrom");
        LocalDate to = asDate(args, "dateTo");
        if (from == null || to == null || to.isBefore(from)) {
            return obj("error", "Cần dateFrom và dateTo hợp lệ.");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            to = from.plusDays(MAX_RANGE_DAYS);
        }

        List<Long> hotelIds = hotelRepository.findByOwnerId(ownerId).stream().map(Hotel::getId).toList();
        if (hotelIds.isEmpty()) {
            return obj("count", 0, "rooms", List.of());
        }
        List<Room> rooms = roomRepository.findByHotelIdInAndStatus(hotelIds, RoomStatus.ACTIVE);
        List<Long> roomIds = rooms.stream().map(Room::getId).toList();
        if (roomIds.isEmpty()) {
            return obj("count", 0, "rooms", List.of());
        }

        Map<Long, List<DailyInventory>> byRoom = dailyInventoryRepository
                .findByIdRoomIdInAndIdDateBetween(roomIds, from, to)
                .stream()
                .collect(Collectors.groupingBy(d -> d.getId().getRoomId()));

        List<Map<String, Object>> out = new ArrayList<>();
        for (Room room : rooms) {
            List<DailyInventory> list = new ArrayList<>(byRoom.getOrDefault(room.getId(), List.of()));
            if (list.isEmpty()) {
                continue;
            }
            list.sort(Comparator.comparing(d -> d.getId().getDate()));
            List<Map<String, Object>> days = new ArrayList<>();
            int minSellable = Integer.MAX_VALUE;
            for (DailyInventory d : list) {
                int sellable = d.getAvailableRooms() - d.getBlockedRooms();
                minSellable = Math.min(minSellable, sellable);
                days.add(obj(
                        "date", String.valueOf(d.getId().getDate()),
                        "available", d.getAvailableRooms(),
                        "blocked", d.getBlockedRooms(),
                        "sellable", sellable));
            }
            out.add(obj(
                    "roomId", room.getId(),
                    "roomName", room.getName(),
                    "hotelName", room.getHotel().getName(),
                    "minSellable", minSellable == Integer.MAX_VALUE ? 0 : minSellable,
                    "days", days));
            if (out.size() >= MAX_ROOMS) {
                break;
            }
        }
        return obj("count", out.size(), "rooms", out);
    }

    private Map<String, Object> revenueStats(Map<String, Object> args) {
        Integer month = asInt(args, "month");
        Integer year = asInt(args, "year");
        if (month == null || year == null || month < 1 || month > 12) {
            return obj("error", "Cần month (1-12) và year hợp lệ.");
        }
        PartnerMonthlyStatsResponse stats = partnerBookingService.getPartnerMonthlyStats(null, year);
        PartnerMonthlyStatsResponse.MonthlyBucket bucket = stats.months().get(month - 1);
        return obj(
                "month", month,
                "year", year,
                "revenue", bucket.revenue(),
                "bookings", bucket.count(),
                "yearTotalRevenue", stats.totalRevenue(),
                "yearConfirmedBookings", stats.confirmedBookings(),
                "yearCancelledBookings", stats.cancelledBookings(),
                "note", "revenue đã loại bỏ booking CANCELLED; đơn vị VND.");
    }

    private Map<String, Object> upcomingCheckins(long ownerId, Map<String, Object> args) {
        int days = asInt(args, "days", 3);
        if (days < 0) {
            days = 3;
        }
        String statusStr = asString(args, "status", "all");
        BookingStatus status = switch (statusStr.toLowerCase()) {
            case "pending" -> BookingStatus.PENDING_PAYMENT;
            case "confirmed" -> BookingStatus.CONFIRMED;
            default -> null;
        };

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> list = bookingRepository
                .findPartnerBookingSummaries(ownerId, null, status, today, today.plusDays(days),
                        PageRequest.of(0, MAX_CHECKINS))
                .getContent()
                .stream()
                .map(b -> obj(
                        "bookingId", b.bookingId(),
                        "customerName", b.customerName(),
                        "hotelName", b.hotelName(),
                        "checkIn", String.valueOf(b.checkIn()),
                        "checkOut", String.valueOf(b.checkOut()),
                        "guests", b.guests(),
                        "status", b.status() != null ? b.status().name() : null))
                .toList();
        return obj("days", days, "count", list.size(), "bookings", list);
    }

    private Map<String, Object> blockRoom(Map<String, Object> args) {
        Long roomId = asLong(args, "roomId");
        LocalDate from = asDate(args, "dateFrom");
        LocalDate to = asDate(args, "dateTo");
        String action = asString(args, "action", "block");
        String reason = asString(args, "reason");
        if (roomId == null || from == null || to == null || to.isBefore(from)) {
            return obj("error", "Cần roomId, dateFrom, dateTo hợp lệ.");
        }
        boolean block = !"unblock".equalsIgnoreCase(action);
        int affected = partnerRoomCalendarService.blockRooms(roomId, from, to, block, reason);
        return obj(
                "roomId", roomId,
                "action", block ? "block" : "unblock",
                "dateFrom", String.valueOf(from),
                "dateTo", String.valueOf(to),
                "daysAffected", affected,
                "reason", reason);
    }

    private Map<String, Object> setRoomPrice(Map<String, Object> args) {
        Long roomId = asLong(args, "roomId");
        LocalDate from = asDate(args, "dateFrom");
        LocalDate to = asDate(args, "dateTo");
        Long price = asLong(args, "price");
        if (roomId == null || from == null || to == null || to.isBefore(from) || price == null || price < 0) {
            return obj("error", "Cần roomId, dateFrom, dateTo hợp lệ và price >= 0.");
        }
        int days = partnerRoomCalendarService.setRoomPrice(roomId, from, to, price);
        return obj(
                "roomId", roomId,
                "price", price,
                "dateFrom", String.valueOf(from),
                "dateTo", String.valueOf(to),
                "daysAffected", days,
                "note", "Đã đặt giá " + price + "đ/đêm cho " + days + " ngày.");
    }

    /**
     * Tỷ lệ lấp đầy = tổng phòng đã đặt/khoá (blockedRooms) / tổng phòng mở bán (availableRooms)
     * trên toàn bộ room-day trong range. blockedRooms gồm cả booking và block thủ công.
     */
    private Map<String, Object> occupancyRate(long ownerId, Map<String, Object> args) {
        LocalDate from = asDate(args, "dateFrom");
        LocalDate to = asDate(args, "dateTo");
        if (from == null || to == null || to.isBefore(from)) {
            return obj("error", "Cần dateFrom và dateTo hợp lệ.");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            to = from.plusDays(MAX_RANGE_DAYS);
        }
        Long hotelId = asLong(args, "hotelId");

        List<Hotel> hotels = hotelRepository.findByOwnerId(ownerId);
        if (hotelId != null) {
            hotels = hotels.stream().filter(h -> h.getId().equals(hotelId)).toList();
        }
        List<Long> hotelIds = hotels.stream().map(Hotel::getId).toList();
        if (hotelIds.isEmpty()) {
            return obj("error", "Không tìm thấy khách sạn của đối tác.");
        }
        List<Long> roomIds = roomRepository.findByHotelIdInAndStatus(hotelIds, RoomStatus.ACTIVE)
                .stream().map(Room::getId).toList();
        if (roomIds.isEmpty()) {
            return obj("occupancyRate", 0, "note", "Chưa có phòng nào đang mở bán.");
        }

        long capacity = 0;
        long occupied = 0;
        for (DailyInventory d : dailyInventoryRepository.findByIdRoomIdInAndIdDateBetween(roomIds, from, to)) {
            capacity += d.getAvailableRooms();
            occupied += d.getBlockedRooms();
        }
        double rate = capacity > 0 ? (double) occupied / capacity * 100 : 0;
        return obj(
                "dateFrom", String.valueOf(from),
                "dateTo", String.valueOf(to),
                "hotelCount", hotelIds.size(),
                "totalRoomDays", capacity,
                "occupiedRoomDays", occupied,
                "occupancyRate", Math.round(rate * 10) / 10.0,
                "note", "occupancyRate là % phòng đã đặt hoặc bị khoá trên tổng phòng mở bán "
                        + "(gồm cả booking và block thủ công).");
    }

    /**
     * Đánh giá gần đây của khách sạn đối tác (tái dùng {@link HotelReviewService#getPartnerReviews}).
     * Trả raw để model tự tóm tắt cảm nhận chung và điểm cần cải thiện.
     */
    private Map<String, Object> recentReviews(Map<String, Object> args) {
        Long hotelId = asLong(args, "hotelId");
        Integer rating = asInt(args, "rating");
        int limit = Math.min(Math.max(asInt(args, "limit", 5), 1), 10);

        PartnerReviewSearchRequest request = new PartnerReviewSearchRequest();
        request.setHotelId(hotelId);
        request.setRating(rating);

        List<Map<String, Object>> reviews = new ArrayList<>();
        for (HotelReviewResponse r : hotelReviewService.getPartnerReviews(request)) {
            String comment = r.comment();
            reviews.add(obj(
                    "reviewId", r.reviewId(),
                    "rating", r.rating(),
                    "comment", comment != null && comment.length() > 300 ? comment.substring(0, 300) + "…" : comment,
                    "reviewer", r.reviewerName(),
                    "hasReply", r.partnerReply() != null && !r.partnerReply().isBlank(),
                    "createdAt", String.valueOf(r.createdAt())));
            if (reviews.size() >= limit) {
                break;
            }
        }
        if (reviews.isEmpty()) {
            return obj("count", 0, "reviews", List.of(), "note", "Chưa có đánh giá phù hợp tiêu chí.");
        }
        return obj("count", reviews.size(), "reviews", reviews,
                "note", "Hãy tóm tắt ngắn gọn cảm nhận chung và 1-2 điểm cần cải thiện (nếu có). "
                        + "Dùng reviewId nếu đối tác muốn trả lời.");
    }

    /** Chi tiết 1 booking của đối tác (read-only). Tái dùng {@link PartnerBookingService#getPartnerBooking}. */
    private Map<String, Object> bookingDetail(Map<String, Object> args) {
        Long bookingId = asLong(args, "bookingId");
        if (bookingId == null) {
            return obj("error", "Thiếu mã booking.");
        }
        PartnerBookingDetailResponse d = partnerBookingService.getPartnerBooking(bookingId);
        List<Map<String, Object>> items = d.items().stream()
                .map(it -> obj(
                        "roomId", it.roomTypeId(),
                        "roomName", it.roomTypeName(),
                        "quantity", it.quantity(),
                        "price", it.stayPrice()))
                .collect(Collectors.toList());
        Map<String, Object> m = obj(
                "bookingId", d.bookingId(),
                "hotelName", d.hotelName(),
                "status", d.status() != null ? d.status().name() : null,
                "checkIn", String.valueOf(d.checkIn()),
                "checkOut", String.valueOf(d.checkOut()),
                "guests", d.guests(),
                "totalPrice", d.totalPrice(),
                "items", items);
        if (d.contact() != null) {
            m.put("customerName", d.contact().fullName());
            m.put("customerPhone", d.contact().phone());
        }
        return m;
    }

    /** Tổng quan nhanh cho đối tác hôm nay. Gộp từ các query/method sẵn có. */
    private Map<String, Object> todayOverview(long ownerId) {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> checkins = bookingRepository
                .findPartnerBookingSummaries(ownerId, null, null, today, today, PageRequest.of(0, MAX_CHECKINS))
                .getContent().stream()
                .map(b -> obj(
                        "bookingId", b.bookingId(),
                        "customerName", b.customerName(),
                        "hotelName", b.hotelName(),
                        "guests", b.guests(),
                        "status", b.status() != null ? b.status().name() : null))
                .collect(Collectors.toList());

        long pendingCount = bookingRepository
                .findPartnerBookingSummaries(ownerId, null, BookingStatus.PENDING_PAYMENT,
                        today, today.plusDays(14), PageRequest.of(0, MAX_CHECKINS))
                .getTotalElements();

        PartnerMonthlyStatsResponse stats = partnerBookingService.getPartnerMonthlyStats(null, today.getYear());
        PartnerMonthlyStatsResponse.MonthlyBucket bucket = stats.months().get(today.getMonthValue() - 1);

        List<Map<String, Object>> lowRooms = new ArrayList<>();
        Map<String, Object> avail = availableRooms(ownerId,
                obj("dateFrom", today.toString(), "dateTo", today.plusDays(7).toString()));
        if (avail.get("rooms") instanceof List<?> rooms) {
            for (Object o : rooms) {
                if (o instanceof Map<?, ?> r && r.get("minSellable") instanceof Number n && n.intValue() <= 2) {
                    lowRooms.add(obj(
                            "roomName", r.get("roomName"),
                            "hotelName", r.get("hotelName"),
                            "minSellable", r.get("minSellable")));
                }
            }
        }

        return obj(
                "date", today.toString(),
                "checkinsTodayCount", checkins.size(),
                "checkinsToday", checkins,
                "pendingPaymentCount", pendingCount,
                "monthRevenue", bucket.revenue(),
                "monthBookings", bucket.count(),
                "lowAvailabilityRooms", lowRooms,
                "note", "Tóm tắt cho đối tác: check-in hôm nay, đơn chờ thanh toán, doanh thu tháng này và "
                        + "các phòng sắp hết chỗ (còn ≤ 2) trong 7 ngày tới.");
    }

    /** Xu hướng doanh thu: chuỗi tháng gần nhất + thay đổi so tháng trước (MoM) và cùng kỳ năm trước (YoY). */
    private Map<String, Object> revenueTrend(Map<String, Object> args) {
        int year = asInt(args, "year", LocalDate.now().getYear());
        int months = Math.min(Math.max(asInt(args, "months", 6), 1), 12);

        PartnerMonthlyStatsResponse cur = partnerBookingService.getPartnerMonthlyStats(null, year);
        PartnerMonthlyStatsResponse prev = partnerBookingService.getPartnerMonthlyStats(null, year - 1);

        int lastMonth = year == LocalDate.now().getYear() ? LocalDate.now().getMonthValue() : 12;
        int startMonth = Math.max(1, lastMonth - months + 1);

        List<Map<String, Object>> series = new ArrayList<>();
        for (int m = startMonth; m <= lastMonth; m++) {
            PartnerMonthlyStatsResponse.MonthlyBucket b = cur.months().get(m - 1);
            series.add(obj("month", m, "revenue", b.revenue(), "bookings", b.count()));
        }

        long curRev = cur.months().get(lastMonth - 1).revenue();
        Long momPct = null;
        if (lastMonth >= 2) {
            long prevRev = cur.months().get(lastMonth - 2).revenue();
            momPct = prevRev > 0 ? Math.round((curRev - prevRev) * 100.0 / prevRev) : null;
        }
        long yoyBase = prev.months().get(lastMonth - 1).revenue();
        Long yoyPct = yoyBase > 0 ? Math.round((curRev - yoyBase) * 100.0 / yoyBase) : null;

        return obj(
                "year", year,
                "currentMonth", lastMonth,
                "currentMonthRevenue", curRev,
                "months", series,
                "momChangePct", momPct,
                "yoyChangePct", yoyPct,
                "yearTotalRevenue", cur.totalRevenue(),
                "note", "momChangePct = % thay đổi so tháng trước; yoyChangePct = so cùng kỳ năm trước; "
                        + "null nghĩa là kỳ gốc bằng 0. Đơn vị VND.");
    }

    /** Gửi phản hồi của đối tác cho 1 đánh giá. Tái dùng {@link HotelReviewService#replyToReview}. */
    private Map<String, Object> replyToReview(Map<String, Object> args) {
        Long reviewId = asLong(args, "reviewId");
        String reply = asString(args, "reply");
        if (reviewId == null || reply == null || reply.isBlank()) {
            return obj("error", "Cần reviewId và nội dung phản hồi.");
        }
        HotelReviewResponse r = hotelReviewService.replyToReview(reviewId, new PartnerReviewReplyRequest(reply.trim()));
        return obj(
                "reviewId", r.reviewId(),
                "rating", r.rating(),
                "reply", r.partnerReply(),
                "note", "Đã gửi phản hồi cho đánh giá #" + r.reviewId() + ".");
    }
}
