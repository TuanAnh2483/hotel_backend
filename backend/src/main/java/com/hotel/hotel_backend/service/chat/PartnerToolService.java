package com.hotel.hotel_backend.service.chat;

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

    @Transactional
    public Map<String, Object> execute(String name, Map<String, Object> args) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        return switch (name) {
            case "get_available_rooms" -> availableRooms(ownerId, args);
            case "get_revenue_stats" -> revenueStats(args);
            case "get_upcoming_checkins" -> upcomingCheckins(ownerId, args);
            case "block_room" -> blockRoom(args);
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
}
