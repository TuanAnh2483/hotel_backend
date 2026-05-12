package com.hotel.hotel_backend.service.price.ai;

import com.hotel.hotel_backend.dto.PricingSuggestion;
import com.hotel.hotel_backend.entity.PriceFeedback;
import com.hotel.hotel_backend.entity.PricingModel;
import com.hotel.hotel_backend.entity.Room;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeminiPromptBuilder {

    public String build(
            Room room,
            List<PricingSuggestion> pricing,
            PricingModel model,
            List<PriceFeedback> recentFeedback,
            int avgLeadDays
    ) {
        StringBuilder sb = new StringBuilder();

        sb.append("Bạn là AI quản lý doanh thu khách sạn chuyên nghiệp tại Việt Nam.\n");
        sb.append("Nhiệm vụ: đề xuất giá phòng tối ưu cho từng ngày bên dưới.\n\n");

        // ── Room info ────────────────────────────────────────────────────────
        sb.append("Thông tin phòng:\n");
        sb.append("- Tên phòng: ").append(room.getName()).append("\n");
        sb.append("- Giá nền: ").append(String.format("%,d", room.getPrice())).append(" VND\n");
        sb.append("- Khách thường đặt trước trung bình: ").append(avgLeadDays).append(" ngày\n\n");

        // ── Model context ────────────────────────────────────────────────────
        if (model.getTrainingRound() > 0) {
            sb.append("Thông tin mô hình AI đã học cho phòng này:\n");
            sb.append("- Số vòng huấn luyện: ").append(model.getTrainingRound()).append("\n");
            sb.append("- Tỉ lệ partner chấp nhận đề xuất: ")
                    .append(String.format("%.0f%%", model.getLastAcceptanceRate() * 100)).append("\n");
            sb.append("- Hệ số tích cực giá học được: ")
                    .append(String.format("%.2f", model.getPriceAggressiveness()))
                    .append(" (1.0=mặc định, <1=thận trọng, >1=có thể đẩy cao hơn)\n");
            if (model.getAvgWeekdayOcc() != null)
                sb.append("- Công suất TB ngày thường (lịch sử 8 tuần): ")
                        .append(String.format("%.0f%%", model.getAvgWeekdayOcc() * 100)).append("\n");
            if (model.getAvgWeekendOcc() != null)
                sb.append("- Công suất TB cuối tuần (lịch sử 8 tuần): ")
                        .append(String.format("%.0f%%", model.getAvgWeekendOcc() * 100)).append("\n");
            sb.append("→ Hãy ưu tiên dữ liệu lịch sử này khi đề xuất giá.\n\n");
        }

        // ── Pricing rules ────────────────────────────────────────────────────
        sb.append("Quy tắc định giá (áp dụng linh hoạt):\n");
        sb.append("- Công suất ≥85%: tăng 15–25% so với giá hiện tại\n");
        sb.append("- Công suất 60–84%: tăng 5–10%\n");
        sb.append("- Công suất <60%: giảm 5–15% để kích cầu\n");
        sb.append("- Cuối tuần: cộng thêm 5–15%\n");
        sb.append("- Ngày lễ nhỏ: cộng thêm 8–15%; Ngày lễ lớn: cộng thêm 25–40%\n");
        sb.append("- velocity≥3 trong 7 ngày: tăng thêm 5–10%\n");
        sb.append("- daysUntil≤3 và velocity=0: xem xét giảm nhẹ\n");
        sb.append("- Tránh tăng quá 50% so với giá nền; giá PHẢI là bội số của 1000 VND\n\n");

        // ── Recent feedback ──────────────────────────────────────────────────
        if (recentFeedback != null && !recentFeedback.isEmpty()) {
            sb.append("Lịch sử quyết định gần đây của partner (học từ đây):\n");
            for (PriceFeedback f : recentFeedback) {
                sb.append("- ").append(f.getDate())
                        .append(": đề xuất ").append(String.format("%,d", f.getSuggestedPrice())).append("đ");
                if (f.getAppliedPrice() != null)
                    sb.append(" → áp dụng ").append(String.format("%,d", f.getAppliedPrice())).append("đ");
                sb.append(" [").append(f.getOutcome()).append("]\n");
            }
            sb.append("Nếu partner hay SKIPPED → đề xuất thận trọng hơn. ");
            sb.append("Nếu hay APPLIED_MINUS5 → giảm đề xuất ~5%.\n\n");
        }

        // ── Per-day data ─────────────────────────────────────────────────────
        sb.append("Dữ liệu từng ngày:\n");
        for (PricingSuggestion p : pricing) {
            sb.append("- date=").append(p.date())
                    .append(" currentPrice=").append(String.format("%,d", p.currentPrice())).append("VND")
                    .append(" occupancy=").append(String.format("%.0f%%", p.occupancy() * 100))
                    .append(" demand=").append(p.demand())
                    .append(" velocity=").append(p.velocity())
                    .append(" daysUntil=").append(p.daysUntil());
            if (p.isWeekend())  sb.append(" weekend=true");
            if (p.isHoliday())  sb.append(" holiday=").append(p.holidayTier());
            if (p.suggestedPrice() != null)
                sb.append(" ruleBaseline=").append(String.format("%,d", p.suggestedPrice())).append("VND");
            sb.append("\n");
        }

        // ── Output format ────────────────────────────────────────────────────
        sb.append("\nChỉ trả về JSON array hợp lệ (KHÔNG có text thêm, KHÔNG markdown):\n");
        sb.append("[{\"date\":\"YYYY-MM-DD\",\"suggestedPrice\":1500000,");
        sb.append("\"priceLow\":1380000,\"priceHigh\":1620000,");
        sb.append("\"reason\":\"lý do ngắn tối đa 12 từ tiếng Việt\"}]");

        return sb.toString();
    }
}