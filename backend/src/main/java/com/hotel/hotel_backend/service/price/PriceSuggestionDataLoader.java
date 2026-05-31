package com.hotel.hotel_backend.service.price;

import com.hotel.hotel_backend.dto.PriceSuggestionData;
import com.hotel.hotel_backend.entity.*;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.DailyRateRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class PriceSuggestionDataLoader {
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final DailyRateRepository dailyRateRepository;
    private final SecurityService securityService;

    public PriceSuggestionData load (Long roomId, LocalDate from, LocalDate to) {
        Long ownerId = securityService.getCurrentPrincipal().userId();
        Room room = roomRepository.findByIdAndHotelOwnerId(roomId,ownerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Room Not Found"));

         Long hotelid = room.getHotel().getId(); //Lấy id của khách sạn mà phòng room đang thuộc về, rồi gán vào biến hotelid

        Map<LocalDate,Long> rateByDate = dailyRateRepository.findByIdRoomIdAndIdDateBetween(roomId,from,to)
                .stream()
                .collect(Collectors.toMap(rate -> rate.getId().date(),DailyRate::getPrice));

        LocalDate today = LocalDate.now();
        // Dùng cho training model: lấy toàn bộ booking của partner để phân tích
        List<Booking> allBooking = bookingRepository.findPartnerBookingsForAnalytics(ownerId,hotelid,today.minusDays(90),to);

        List<Booking> active = allBooking.stream()
                .filter(booking -> booking.getStatus() != BookingStatus.CANCELLED)// Chỉ tính booking không bị hủy để đánh giá công suất thực tế
                .toList();

        long historicalCount = active.stream()
                .filter(b -> !b.getCheckIn().isAfter(today))
                .count();

        String confidence = computeConfidence((int) historicalCount);


        // Lấy lead time (số ngày đặt trước) của các booking đã check-in để tính trung bình
        OptionalDouble avgLeadOpt = active.stream()
                .filter(b -> b.getCreatedAt() != null)
                .mapToLong(b-> ChronoUnit.DAYS.between(b.getCreatedAt().toLocalDate(),b.getCheckIn())) // Chỉ tính lead time của booking đã check-in để phản ánh chính xác thói quen đặt phòng
                .filter(v -> v >= 0) // Loại bỏ lead time âm (nếu có dữ liệu lỗi)
                .average(); //dữ liệu lead time không hợp lệ, mặc định là 7 ngày


        int avgLeadDays = (int) Math.round(avgLeadOpt.orElse(7.0));

        List<Booking> activeBookings = allBooking.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                .toList();

        return new PriceSuggestionData(
                ownerId,
                room,
                hotelid,
                room.getPrice(),
                room.getQuantity(),
                rateByDate,
                allBooking,
                activeBookings
        );
    }
    private String computeConfidence(int count) {             // Dựa trên số lượng booking lịch sử để đánh giá độ tin cậy của model
        if (count >= 30) return "HIGH";
        if (count >= 10) return "MEDIUM";
        return "LOW";
    }


}

