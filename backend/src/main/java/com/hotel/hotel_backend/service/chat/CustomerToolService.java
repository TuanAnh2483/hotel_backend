package com.hotel.hotel_backend.service.chat;

import com.hotel.hotel_backend.dto.response.HotelAvailableRoomItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.service.LocationNormalizer;
import com.hotel.hotel_backend.service.search.HotelAvailabilityService;
import com.hotel.hotel_backend.service.search.HotelStayCriteria;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asDate;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asInt;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asLong;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.asString;
import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.obj;

/**
 * Thực thi 4 customer tool. Tái dùng {@link HotelAvailabilityService} và các repository
 * sẵn có thay cho raw SQL. Mỗi tool trả về một Map sẽ được serialize làm functionResponse.
 */
@Service
@RequiredArgsConstructor
public class CustomerToolService {

    private static final int MAX_HOTELS = 8;
    private static final int MAX_ROOMS_PER_HOTEL = 4;

    private final HotelRepository hotelRepository;
    private final BookingRepository bookingRepository;
    private final HotelAvailabilityService hotelAvailabilityService;

    @Transactional(readOnly = true)
    public Map<String, Object> execute(String name, Map<String, Object> args) {
        return switch (name) {
            case "search_rooms" -> searchRooms(args);
            case "get_booking_status" -> bookingStatus(args);
            case "find_booking_by_contact" -> bookingByContact(args);
            case "suggest_hotels" -> suggestHotels(args);
            case "get_hotel_faq" -> hotelFaq(args);
            case "get_nearby_attractions" -> nearbyAttractions(args);
            default -> obj("error", "Tool không tồn tại: " + name);
        };
    }

    private Map<String, Object> searchRooms(Map<String, Object> args) {
        LocalDate checkIn = asDate(args, "checkIn");
        LocalDate checkOut = asDate(args, "checkOut");
        int guests = asInt(args, "guests", 1);
        Long maxPrice = asLong(args, "maxPrice");
        Long hotelId = asLong(args, "hotelId");
        String location = asString(args, "location", null);

        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            return obj("error", "Cần checkIn và checkOut hợp lệ (checkOut phải sau checkIn).");
        }

        List<Hotel> hotels = hotelId != null
                ? hotelRepository.findByIdWithCollections(hotelId)
                        .filter(h -> h.getStatus() == HotelStatus.ACTIVE)
                        .map(List::of)
                        .orElse(List.of())
                : hotelRepository.findByStatus(HotelStatus.ACTIVE);

        if (hotelId == null && location != null && !location.isBlank()) {
            hotels = hotels.stream()
                    .filter(h -> LocationNormalizer.provinceMatches(h.getProvince(), location)
                            || LocationNormalizer.districtMatches(h.getDistrict(), location))
                    .toList();
            if (hotels.isEmpty()) {
                return obj("count", 0, "hotels", List.of(),
                        "note", "Không tìm thấy khách sạn nào ở \"" + location + "\".");
            }
        }

        HotelStayCriteria criteria = new HotelStayCriteria(
                checkIn, checkOut, guests, 1, Set.of(), Set.of(), Set.of());
        Map<Long, HotelAvailabilityService.HotelSearchAvailability> availability =
                hotelAvailabilityService.findAvailableHotelSummaries(hotels, criteria);

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Hotel hotel : hotels) {
            if (!availability.containsKey(hotel.getId())) {
                continue;
            }
            List<Map<String, Object>> rooms = new ArrayList<>();
            for (HotelAvailableRoomItemResponse item : hotelAvailabilityService.findAvailableRoomItems(hotel, criteria)) {
                long perNight = nights > 0 ? item.stayPrice() / nights : item.stayPrice();
                if (maxPrice != null && perNight > maxPrice) {
                    continue;
                }
                rooms.add(obj(
                        "roomName", item.name(),
                        "category", item.roomCategory(),
                        "bedType", item.bedType(),
                        "capacity", item.capacity(),
                        "availableUnits", item.availableUnits(),
                        "pricePerNight", perNight,
                        "totalStayPrice", item.stayPrice()));
                if (rooms.size() >= MAX_ROOMS_PER_HOTEL) {
                    break;
                }
            }
            if (rooms.isEmpty()) {
                continue;
            }
            result.add(obj(
                    "hotelId", hotel.getId(),
                    "hotelName", hotel.getName(),
                    "address", hotel.getAddress(),
                    "district", hotel.getDistrict(),
                    "province", hotel.getProvince(),
                    "rooms", rooms));
            if (result.size() >= MAX_HOTELS) {
                break;
            }
        }
        return obj("nights", nights, "count", result.size(), "hotels", result);
    }

    private Map<String, Object> bookingStatus(Map<String, Object> args) {
        Long code = asLong(args, "bookingCode");
        if (code == null) {
            return obj("error", "Thiếu mã booking.");
        }
        return bookingRepository.findByIdWithDetails(code)
                .<Map<String, Object>>map(booking -> {
                    Map<String, Object> m = obj(
                            "bookingId", booking.getId(),
                            "status", booking.getStatus() != null ? booking.getStatus().name() : null,
                            "checkIn", String.valueOf(booking.getCheckIn()),
                            "checkOut", String.valueOf(booking.getCheckOut()),
                            "guests", booking.getGuests(),
                            "totalPrice", booking.getTotalPrice());
                    if (booking.getContact() != null) {
                        m.put("contactName", booking.getContact().getName());
                    }
                    if (!booking.getItems().isEmpty()) {
                        var room = booking.getItems().get(0).getRoom();
                        m.put("roomName", room.getName());
                        if (room.getHotel() != null) {
                            m.put("hotelName", room.getHotel().getName());
                            m.put("hotelAddress", room.getHotel().getAddress());
                        }
                    }
                    return m;
                })
                .orElse(obj("error", "Không tìm thấy booking với mã " + code));
    }

    private Map<String, Object> bookingByContact(Map<String, Object> args) {
        String email = asString(args, "email", null);
        String phone = asString(args, "phone", null);
        email = (email != null && !email.isBlank()) ? email.trim() : null;
        phone = (phone != null && !phone.isBlank()) ? phone.trim() : null;
        if (email == null && phone == null) {
            return obj("error", "Cần email hoặc số điện thoại đã dùng khi đặt phòng.");
        }

        List<Map<String, Object>> bookings = new ArrayList<>();
        for (var booking : bookingRepository.findByContactEmailOrPhone(email, phone)) {
            Map<String, Object> m = obj(
                    "bookingId", booking.getId(),
                    "status", booking.getStatus() != null ? booking.getStatus().name() : null,
                    "checkIn", String.valueOf(booking.getCheckIn()),
                    "checkOut", String.valueOf(booking.getCheckOut()),
                    "guests", booking.getGuests(),
                    "totalPrice", booking.getTotalPrice());
            if (!booking.getItems().isEmpty()) {
                var room = booking.getItems().get(0).getRoom();
                m.put("roomName", room.getName());
                if (room.getHotel() != null) {
                    m.put("hotelName", room.getHotel().getName());
                }
            }
            bookings.add(m);
            if (bookings.size() >= 5) {
                break;
            }
        }
        if (bookings.isEmpty()) {
            return obj("count", 0, "bookings", List.of(),
                    "note", "Không tìm thấy booking nào khớp với thông tin liên hệ này.");
        }
        return obj("count", bookings.size(), "bookings", bookings);
    }

    private Map<String, Object> suggestHotels(Map<String, Object> args) {
        String location = asString(args, "location", null);
        String sortBy = asString(args, "sortBy", "rating");
        boolean byPrice = "price".equalsIgnoreCase(sortBy);

        List<Map<String, Object>> hotels = new ArrayList<>();
        for (Object[] row : hotelRepository.findHotelSuggestionRows()) {
            String province = (String) row[2];
            String district = (String) row[3];
            if (location != null && !location.isBlank()
                    && !LocationNormalizer.provinceMatches(province, location)
                    && !LocationNormalizer.districtMatches(district, location)) {
                continue;
            }
            hotels.add(obj(
                    "hotelId", row[0],
                    "hotelName", row[1],
                    "district", district,
                    "province", province,
                    "ratingAvg", row[4],
                    "ratingCount", row[5],
                    "fromPricePerNight", row[6]));
        }

        java.util.Comparator<Map<String, Object>> cmp = byPrice
                ? java.util.Comparator.comparingLong(h -> ((Number) h.get("fromPricePerNight")).longValue())
                : java.util.Comparator.<Map<String, Object>>comparingDouble(
                        h -> ((Number) h.get("ratingAvg")).doubleValue()).reversed();
        hotels.sort(cmp);
        List<Map<String, Object>> top = hotels.stream().limit(MAX_HOTELS).toList();

        if (top.isEmpty()) {
            return obj("count", 0, "hotels", List.of(),
                    "note", location != null && !location.isBlank()
                            ? "Không tìm thấy khách sạn nào ở \"" + location + "\"."
                            : "Hiện chưa có khách sạn nào để gợi ý.");
        }
        return obj("sortBy", byPrice ? "price" : "rating", "count", top.size(), "hotels", top);
    }

    private Map<String, Object> hotelFaq(Map<String, Object> args) {
        Long hotelId = asLong(args, "hotelId");
        String topic = asString(args, "topic", "general");
        if (hotelId == null) {
            return obj("topic", topic,
                    "note", "Không có khách sạn cụ thể. Trả lời chính sách chung của HotelHub theo chủ đề.");
        }
        return hotelRepository.findByIdWithCollections(hotelId)
                .filter(h -> h.getStatus() == HotelStatus.ACTIVE)
                .<Map<String, Object>>map(hotel -> {
                    List<String> amenities = new ArrayList<>();
                    hotel.getAmenities().forEach(a -> amenities.add(a.name()));
                    amenities.addAll(hotel.getCustomAmenities());
                    return obj(
                            "hotelName", hotel.getName(),
                            "topic", topic,
                            "cancellationPolicy", hotel.getCancellationPolicy() != null
                                    ? hotel.getCancellationPolicy().name() : null,
                            "bookingMode", hotel.getBookingMode() != null
                                    ? hotel.getBookingMode().name() : null,
                            "amenities", amenities);
                })
                .orElse(obj("error", "Không tìm thấy khách sạn."));
    }

    private Map<String, Object> nearbyAttractions(Map<String, Object> args) {
        Long hotelId = asLong(args, "hotelId");
        String category = asString(args, "category", "all");
        if (hotelId == null) {
            return obj("error", "Thiếu hotelId.");
        }
        return hotelRepository.findById(hotelId)
                .<Map<String, Object>>map(hotel -> obj(
                        "hotelName", hotel.getName(),
                        "latitude", hotel.getLatitude(),
                        "longitude", hotel.getLongitude(),
                        "district", hotel.getDistrict(),
                        "province", hotel.getProvince(),
                        "category", category,
                        "note", "Dựa trên district/province (và toạ độ nếu có) để gợi ý địa điểm phù hợp."))
                .orElse(obj("error", "Không tìm thấy khách sạn."));
    }
}
