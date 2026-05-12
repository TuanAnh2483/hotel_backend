package com.hotel.hotel_backend.service.price.ai;

import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.entity.AiPricingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.hotel.hotel_backend.service.price.util.PricingUtils.roundK;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiResponseParser {

    private final ObjectMapper objectMapper;

    public Map<String, AiPricingResult> parse(
            String response,
            List<PricingSuggestion> pricing,
            long basePrice
    ) {
        Map<String, AiPricingResult> result = new HashMap<>();

        // Guardrail: AI không được đề xuất dưới 50% hoặc trên 250% giá nền
        long minAllowed = roundK(basePrice * 0.50);
        long maxAllowed = roundK(basePrice * 2.50);

        try {
            JsonNode root = objectMapper.readTree(response);
            String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

            text = text.replace("```json", "").replace("```", "").trim();

            int start = text.indexOf('[');
            int end   = text.lastIndexOf(']');
            if (start < 0 || end <= start) {
                log.warn("Gemini response has no JSON array");
                return result;
            }

            JsonNode array = objectMapper.readTree(text.substring(start, end + 1));
            for (JsonNode node : array) {
                String date  = node.path("date").asText(null);
                long   price = node.path("suggestedPrice").longValue();
                if (date == null || price <= 0) continue;

                price = roundK(price);
                if (price < minAllowed || price > maxAllowed) {
                    log.warn("Gemini price {} out of guardrail [{},{}] for {}, clamping",
                             price, minAllowed, maxAllowed, date);
                    price = Math.max(minAllowed, Math.min(maxAllowed, price));
                }

                Long low  = node.path("priceLow").isNull()  ? null : node.path("priceLow").longValue();
                Long high = node.path("priceHigh").isNull() ? null : node.path("priceHigh").longValue();
                if (low  == null || low  <= 0) low  = roundK(price * 0.92);
                if (high == null || high <= 0) high = roundK(price * 1.08);
                low  = Math.max(Math.min(low,  price), minAllowed);
                high = Math.min(Math.max(high, price), maxAllowed);

                String reason = node.path("reason").asText(null);
                if (reason == null || reason.isBlank()) reason = "Giá tối ưu bởi AI.";

                result.put(date, new AiPricingResult(price, low, high, reason, List.of(), true));
            }

        } catch (Exception e) {
            log.warn("Failed to parse Gemini response: {}", e.getMessage());
        }
        return result;
    }
}