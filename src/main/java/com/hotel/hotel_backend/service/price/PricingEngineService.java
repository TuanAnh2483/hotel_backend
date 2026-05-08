package com.hotel.hotel_backend.service.price;

import com.hotel.hotel_backend.dto.OccupancyForecast;
import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.entity.PricingModel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.service.price.ModelTrainingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.hotel.hotel_backend.service.price.util.PricingUtils.roundK;

@Service
@RequiredArgsConstructor
public class PricingEngineService {

    /**
     * Logistic Regression optimizer
     * Dùng để tối ưu giá cuối cùng bằng AI model đã train
     */
    private final ModelTrainingService modelTrainingService;

    /**
     * ============================================================
     * ENGINE TÍNH GIÁ
     * ============================================================
     *
     * INPUT:
     * - room               : phòng hiện tại
     * - forecasts          : dữ liệu occupancy forecast
     * - pricingModel       : model AI đã train
     * - ratesByDate        : giá hiện tại trong DB
     *
     * OUTPUT:
     * - danh sách PricingSuggestion
     *
     * FLOW:
     *
     * 1. Lấy occupancy forecast
     * 2. Tính demand factor
     * 3. Tính weekend factor
     * 4. Tính holiday factor
     * 5. Tạo suggested price
     * 6. Logistic Regression optimize
     * 7. Tạo khoảng giá
     * 8. Tính delta %
     * 9. Build PricingSuggestion
     */
    public List<PricingSuggestion> generatePricing(
            Room room,
            List<OccupancyForecast> forecasts,
            PricingModel pricingModel,
            Map<LocalDate, Long> ratesByDate
    ) {

        List<PricingSuggestion> result = new ArrayList<>();

        /**
         * Giá gốc của room
         */
        long basePrice = room.getPrice();

        /**
         * Format UI
         * ví dụ:
         * 2026-05-08 -> 08/05
         */
        DateTimeFormatter ddMM =
                DateTimeFormatter.ofPattern("dd/MM");

        /**
         * =====================================================
         * LOOP TỪNG NGÀY
         * =====================================================
         */
        for (OccupancyForecast fc : forecasts) {

            /**
             * Parse date
             */
            LocalDate date =
                    LocalDate.parse(fc.date());

            /**
             * Giá hiện tại
             *
             * Nếu DB chưa có custom rate
             * -> dùng basePrice
             */
            long currentPrice =
                    ratesByDate.getOrDefault(
                            date,
                            basePrice
                    );

            /**
             * =================================================
             * DEMAND FACTOR
             * =================================================
             *
             * occupancy càng cao
             * -> factor càng lớn
             *
             * priceAggressiveness:
             * model học được partner thích aggressive hay conservative
             *
             * Ví dụ:
             *
             * occupancy = 0.9
             * aggressiveness = 1.1
             *
             * factor ≈ 1.28
             */
            double demandFactor =
                    (0.93 + fc.occupancy() * 0.25)
                            * pricingModel.getPriceAggressiveness();

            /**
             * =================================================
             * WEEKEND FACTOR
             * =================================================
             *
             * cuối tuần tăng 8%
             */
            double weekendFactor =
                    fc.weekend()
                            ? 1.08
                            : 1.0;

            /**
             * =================================================
             * HOLIDAY FACTOR
             * =================================================
             *
             * lễ lớn:
             * +30%
             *
             * lễ nhỏ:
             * +10%
             */
            double holidayFactor = fc.holiday() ? ("MAJOR".equals(fc.holidayTier()) ? 1.30 : 1.10 ): 1.0;

            /**
             * =================================================
             * RULE-BASED PRICE
             *
             * =================================================
             *
             * Công thức:
             *
             * currentPrice
             * × demand
             * × weekend
             * × holiday
             * × partnerAdjustment
             *
             * partnerAdjustment:
             * model học được partner hay giảm giá bao nhiêu
             */
            Long suggestedPrice =
                    currentPrice > 0
                            ? roundK(currentPrice
                                    * demandFactor
                                    * weekendFactor
                                    * holidayFactor
                                    * pricingModel.getPartnerPriceAdjustment()
                    )
                            : null;

            /**
             * =================================================
             * LOGISTIC REGRESSION OPTIMIZATION
             * =================================================
             *
             * Nếu AI model đã train đủ
             * -> dùng LR để tìm giá tối ưu doanh thu
             *
             * argmax:
             *
             * revenue = price × probability_accept
             *
             * optimizePrice():
             * sẽ loop nhiều mức giá
             * rồi chọn giá có expected revenue cao nhất
             */
            if (pricingModel.isLrReady()
                    && currentPrice > 0) {

                Long lrPrice =
                        modelTrainingService.optimizePrice(
                                pricingModel,
                                basePrice,
                                fc.date(),
                                fc.weekend(),
                                fc.holiday()
                        );

                /**
                 * Nếu AI tìm được giá tốt hơn
                 * -> override rule-based
                 */
                if (lrPrice != null) {
                    suggestedPrice = lrPrice;
                }
            }

            /**
             * =================================================
             * PRICE RANGE
             * =================================================
             *
             * Tạo khoảng giá:
             *
             * low  = -8%
             * high = +8%
             */
            Long priceLow =
                    suggestedPrice != null
                            ? roundK(suggestedPrice * 0.92)
                            : null;


            Long priceHigh =
                    suggestedPrice != null
                            ? roundK(suggestedPrice * 1.08)
                            : null;

            /**
             * =================================================
             * DELTA %
             * =================================================
             *
             * So sánh:
             *
             * suggested vs current
             *
             * Ví dụ:
             *
             * current = 1tr
             * suggested = 1tr2
             *
             * => +20%
             */
            double deltaPct =
                    currentPrice > 0
                            && suggestedPrice != null
                            ? (
                            (double) (suggestedPrice - currentPrice) / currentPrice
                    ) * 100
                            : 0.0;

            /**
             * =================================================
             * BUILD DTO
             * =================================================
             *
             * PricingSuggestion:
             * object trung gian
             *
             * Sau này:
             * -> AI reason service dùng tiếp
             * -> response builder dùng tiếp
             */
            result.add(
                    PricingSuggestion.builder()
                            .date(fc.date())
                            .dayName(getDayName(date))
                            .displayDate(date.format(ddMM))
                            .occupancy(fc.occupancy())
                            .demand(fc.demand())
                            .isWeekend(fc.weekend())
                            .isHoliday(fc.holiday())
                            .holidayTier(fc.holidayTier())
                            .currentPrice(currentPrice)
                            .suggestedPrice(suggestedPrice)
                            .priceLow(priceLow)
                            .priceHigh(priceHigh)
                            .deltaPct(deltaPct)
                            .confidence(fc.confidence())
                            .activeBookings(fc.activeBookings())
                            .totalRooms(fc.totalRooms())
                            .build()
            );
        }

        return result;
    }

    // =====================================================
    // HELPERS
    // =====================================================

    /**
     * Convert dayOfWeek -> UI text
     */
    private String getDayName(LocalDate d) {

        return switch (d.getDayOfWeek()) {

            case MONDAY -> "Th 2";

            case TUESDAY -> "Th 3";

            case WEDNESDAY -> "Th 4";

            case THURSDAY -> "Th 5";

            case FRIDAY -> "Th 6";

            case SATURDAY -> "T7";

            case SUNDAY -> "CN";
        };
    }
}