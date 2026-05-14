package com.hotel.hotel_backend.service.price.ai;

import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.entity.AiPricingResult;
import com.hotel.hotel_backend.service.price.SeasonalPricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.hotel.hotel_backend.service.price.util.PricingUtils.roundK;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleBasedReasonService {

    private final SeasonalPricingService seasonalPricingService;

    /**
     * Merge AI results with rule-based fallback.
     * Days that Gemini already covered keep the AI result; missing days get a
     * context-aware rule-based reason.
     */
    public Map<String, AiPricingResult> mergeFallback(
            List<PricingSuggestion> pricing,
            Map<String, AiPricingResult> parsed
    ) {
        Map<String, AiPricingResult> result = new HashMap<>();
        for (PricingSuggestion p : pricing) {
            AiPricingResult ai = parsed.get(p.date());
            result.put(p.date(), ai != null ? ai : buildRule(p));
        }
        return result;
    }

    /**
     * Full rule-based table — used when Gemini is unavailable entirely.
     */
    public Map<String, AiPricingResult> buildFallback(List<PricingSuggestion> pricing) {
        Map<String, AiPricingResult> result = new HashMap<>();
        for (PricingSuggestion p : pricing) {
            result.put(p.date(), buildRule(p));
        }
        return result;
    }

    // ── Core builder ──────────────────────────────────────────────────────────

    private AiPricingResult buildRule(PricingSuggestion p) {
        String reason = buildReason(p);

        if (p.suggestedPrice() == null) {
            log.debug("[Fallback] date={} suggestedPrice=null, returning null result", p.date());
            return new AiPricingResult(null, null, null, reason, List.of(), false);
        }

        return new AiPricingResult(
                p.suggestedPrice(),
                roundK(p.suggestedPrice() * 0.92),
                roundK(p.suggestedPrice() * 1.08),
                reason,
                List.of(),
                false
        );
    }

    /**
     * Build a short, context-aware reason in Vietnamese.
     *
     * Priority order:
     *  1. Public holiday (major > minor)
     *  2. Seasonal label (Tết, summer peak, low season…)
     *  3. Weekend
     *  4. Booking velocity signal
     *  5. Last-minute low demand
     *  6. Plain demand level (HIGH / MEDIUM / LOW)
     */
    private String buildReason(PricingSuggestion p) {

        // 1. Holiday takes highest priority
        if (p.isHoliday()) {
            if ("MAJOR".equals(p.holidayTier())) {
                return p.velocity() >= 3
                        ? "Ngày lễ lớn, đặt phòng tăng nhanh."
                        : "Ngày lễ lớn, nhu cầu cao.";
            }
            return "HIGH".equals(p.demand())
                    ? "Ngày lễ, công suất cao."
                    : "Ngày lễ, nhu cầu tăng nhẹ.";
        }

        // 2. Seasonal context
        String season = seasonalPricingService.getSeasonLabel(LocalDate.parse(p.date()));

        // 3. Weekend + season combo
        if (p.isWeekend()) {
            if (season != null && "HIGH".equals(p.demand()))
                return "Cuối tuần " + season.toLowerCase() + ", lấp đầy cao.";
            if (season != null)
                return "Cuối tuần, " + season.toLowerCase() + ".";
            if ("HIGH".equals(p.demand()))
                return "Cuối tuần, công suất cao.";
            if ("LOW".equals(p.demand()))
                return "Cuối tuần, lấp đầy thấp, giảm nhẹ.";
            return "Cuối tuần, nhu cầu ổn định.";
        }

        // 4. Seasonal weekday (no weekend)
        if (season != null) {
            if ("HIGH".equals(p.demand()))
                return season + ", nhu cầu cao.";
            if ("LOW".equals(p.demand()))
                return season + ", ưu tiên lấp đầy.";
            return season + ".";
        }

        // 5. Booking velocity — strong signal
        if (p.velocity() >= 3)
            return "Đặt phòng tăng nhanh, tăng giá.";

        // 6. Last-minute with low demand
        if (p.daysUntil() <= 2 && "LOW".equals(p.demand()))
            return "Sắp đến ngày, ưu tiên lấp đầy.";

        // 7. Plain demand level
        return switch (p.demand()) {
            case "HIGH" -> "Công suất cao, tăng giá.";
            case "LOW"  -> "Nhu cầu thấp, giảm nhẹ.";
            default     -> "Nhu cầu ổn định.";
        };
    }
}
