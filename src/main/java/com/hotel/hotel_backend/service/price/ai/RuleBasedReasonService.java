package com.hotel.hotel_backend.service.price.ai;


import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.entity.AiPricingResult;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.hotel.hotel_backend.service.price.util.PricingUtils.roundK;

@Service
public class RuleBasedReasonService {

    /**
     * Hợp nhất kết quả từ AI và kết quả dự phòng (Fallback).
     * Ưu tiên kết quả từ AI, nếu không có thì mới tự tạo lý do theo quy tắc cứng.
     */
    public Map<String, AiPricingResult> mergeFallback(
            List<PricingSuggestion> pricing,
            Map<String, AiPricingResult> parsed
    )
        {
        Map<String, AiPricingResult> result = new HashMap<>();

        for (PricingSuggestion p : pricing) {
            // Kiểm tra xem ngày này AI đã có câu trả lời chưa
            AiPricingResult ai = parsed.get(p.date());

            if (ai != null) {
                // Nếu có AI: Giữ nguyên kết quả của AI
                result.put(p.date(), ai);
            } else {
                // Nếu không có AI: Tự tạo lý do và biên độ giá dựa trên logic "cứng"
                result.put(p.date(), buildRule(p));
            }
        }
        return result;
    }

    /**
     * Tạo toàn bộ bảng giá dựa trên quy tắc dự phòng (không cần AI).
     */
    public Map<String, AiPricingResult> buildFallback(
            List<PricingSuggestion> pricing
    ) {
        Map<String, AiPricingResult> result = new HashMap<>();

        for (PricingSuggestion p : pricing) {
            // Duyệt từng ngày và áp dụng quy tắc mặc định
            result.put(p.date(), buildRule(p));
        }
        return result;
    }

    /**
     * Hàm cốt lõi: Tự động "nặn" ra lý do và dải giá an toàn dựa trên nhu cầu (demand).
     */
    private AiPricingResult buildRule(PricingSuggestion p) {
        String reason;

        // Phân loại lý do dựa trên nhãn nhu cầu đã tính toán trước đó
        if ("HIGH".equals(p.demand())) {
            reason = "Nhu cầu cao, tăng giá.";
        } else if ("LOW".equals(p.demand())) {
            reason = "Nhu cầu thấp, giảm nhẹ.";
        } else {
            reason = "Nhu cầu ổn định.";
        }

        // Trả về kết quả gồm:
        // 1. Giá gợi ý gốc
        // 2. Giá tối thiểu (Giảm 8% để chủ nhà cân nhắc)
        // 3. Giá tối đa (Tăng 8% để chủ nhà cân nhắc)
        // 4. Câu lý do vừa tạo ở trên
        // 5. List.of(): Không có danh sách hành động đi kèm
        // 6. false: Đánh dấu đây KHÔNG phải là kết quả do AI xử lý
        return new AiPricingResult(
                p.suggestedPrice(),
                roundK(p.suggestedPrice() * 0.92),
                roundK(p.suggestedPrice() * 1.08),
                reason,
                List.of(),
                false
        );
    }
}

