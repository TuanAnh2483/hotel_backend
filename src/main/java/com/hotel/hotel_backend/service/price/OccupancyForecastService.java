package com.hotel.hotel_backend.service.price;

import com.hotel.hotel_backend.dto.OccupancyForecast;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.PricingModel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.service.search.HolidayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static com.hotel.hotel_backend.service.price.util.PricingUtils.computeConfidence;
import static com.hotel.hotel_backend.service.price.util.PricingUtils.getDemand;

@Service
@RequiredArgsConstructor
public class OccupancyForecastService {

    private final HolidayService holidayService;

    public List<OccupancyForecast> forecast(
            Room room,
            List<Booking> allBookings,
            PricingModel pricingModel,
            LocalDate from,
            LocalDate to
    ) {

        List<Booking> active = allBookings.stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                .toList();

        LocalDate today = LocalDate.now();

        long historicalCount = active.stream()
                .filter(b -> !b.getCheckIn().isAfter(today))
                .count();

        int historicalCountInt = (int) historicalCount;

        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        int totalRooms = room.getQuantity();

        List<OccupancyForecast> forecasts = new ArrayList<>();

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {

            final LocalDate d = date;

            int dow = d.getDayOfWeek().getValue();

            boolean isWeekend = dow >= 6;

            String holidayTier =
                    holidayService.getHolidayMap().get(d.toString());

            boolean isHoliday = holidayTier != null;

            // booking đang cover ngày đó
            int activeBookings = (int) active.stream()
                    .filter(b ->
                            !b.getCheckIn().isAfter(d)
                                    && b.getCheckOut().isAfter(d))
                    .count();

            // booking mới tạo trong 7 ngày gần đây
            int velocity = (int) allBookings.stream()
                    .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                    .filter(b ->
                            !b.getCheckIn().isAfter(d)
                                    && b.getCheckOut().isAfter(d))
                    .filter(b ->
                            b.getCreatedAt() != null
                                    && b.getCreatedAt().isAfter(sevenDaysAgo))
                    .count();

            int daysUntil =
                    (int) ChronoUnit.DAYS.between(today, d);

            // occupancy cơ bản
            double baseOcc = totalRooms > 0
                    ? (double) activeBookings / totalRooms
                    : 0.0;

            double occ = baseOcc;

            // blend lịch sử
            if (!isHoliday) {

                Double historicalOcc = isWeekend
                        ? pricingModel.getAvgWeekendOcc()
                        : pricingModel.getAvgWeekdayOcc();

                if (historicalOcc != null) {

                    double histWeight =
                            Math.min(0.45, daysUntil / 30.0);

                    occ =
                            (1 - histWeight) * baseOcc
                                    + histWeight * historicalOcc;
                }
            }

            // learned boost — dùng 0.0 khi model chưa có dữ liệu (tránh NPE unbox null Double)
            Double rawBoost = isHoliday
                    ? ("MAJOR".equals(holidayTier)
                    ? pricingModel.getMajorHolidayBoost()
                    : pricingModel.getMinorHolidayBoost())
                    : (isWeekend
                    ? pricingModel.getWeekendBoost()
                    : pricingModel.getWeekdayBoost());

            occ = Math.min(occ + (rawBoost != null ? rawBoost : 0.0), 1.0);

            // lễ thì tối thiểu 88%
            if (isHoliday) {
                occ = Math.max(occ, 0.88);
            }

            String demand = getDemand(occ);
            String confidence = computeConfidence(historicalCountInt, daysUntil);

            forecasts.add(
                    OccupancyForecast.builder()
                            .date(d.toString())
                            .occupancy(occ)
                            .demand(demand)
                            .weekend(isWeekend)
                            .holiday(isHoliday)
                            .holidayTier(holidayTier)
                            .activeBookings(activeBookings)
                            .totalRooms(totalRooms)
                            .velocity(velocity)
                            .daysUntil(daysUntil)
                            .confidence(confidence)
                            .build()
            );
        }

        return forecasts;
    }
}