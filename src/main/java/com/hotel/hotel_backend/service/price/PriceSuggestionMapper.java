package com.hotel.hotel_backend.service.price;
import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.dto.response.PriceSuggestionItem;
import com.hotel.hotel_backend.entity.AiPricingResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
@Component
public class PriceSuggestionMapper {

    public List<PriceSuggestionItem> toItems(
            List<PricingSuggestion> pricing,
            Map<String, AiPricingResult> aiResults
    ) {

        return pricing.stream()
                .map(p -> {

                    AiPricingResult ai =
                            aiResults.get(p.date());

                    Long finalPrice =
                            ai != null && ai.suggestedPrice() != null
                                    ? ai.suggestedPrice()
                                    : p.suggestedPrice();

                    Long finalLow =
                            ai != null && ai.priceLow() != null
                                    ? ai.priceLow()
                                    : p.priceLow();

                    Long finalHigh =
                            ai != null && ai.priceHigh() != null
                                    ? ai.priceHigh()
                                    : p.priceHigh();

                    String reason =
                            ai != null && ai.reason() != null
                                    ? ai.reason()
                                    : "Giá đề xuất theo phân tích nhu cầu tự động.";

                    List<String> factors =
                            ai != null
                                    ? ai.factors()
                                    : List.of();

                    boolean aiGenerated =
                            ai != null && ai.aiGenerated();

                    double finalDeltaPct =
                            p.currentPrice() > 0
                                    && finalPrice != null
                                    ? (
                                    (double) (
                                            finalPrice - p.currentPrice()
                                    ) / p.currentPrice()
                            ) * 100
                                    : 0.0;

                    return new PriceSuggestionItem(
                            p.date(),
                            p.dayName(),
                            p.displayDate(),
                            p.occupancy(),
                            p.demand(),
                            p.isWeekend(),
                            p.isHoliday(),
                            p.holidayTier(),
                            p.currentPrice(),
                            finalPrice,
                            finalLow,
                            finalHigh,
                            finalDeltaPct,
                            p.confidence(),
                            reason,
                            factors,
                            p.activeBookings(),
                            p.totalRooms(),
                            aiGenerated,
                            p.velocity(),
                            p.daysUntil()
                    );
                })
                .toList();
    }
}
