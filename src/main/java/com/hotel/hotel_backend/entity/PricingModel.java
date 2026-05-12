package com.hotel.hotel_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mô hình giá học máy cho mỗi phòng.
 * Được huấn luyện mỗi đêm từ dữ liệu đặt phòng và phản hồi của partner.
 */
@Getter  //
@Setter
@Entity
@Table(name = "pricing_model")
public class PricingModel {

    @Id
    private Long roomId;          // 1 model ↔ 1 phòng

    // ── Tham số boost công suất (học từ lịch sử đặt phòng) ──────────────────
    @Column(nullable = false)
    private double weekdayBoost = 0.06;       // mặc định +6% ngày thường

    @Column(nullable = false)
    private double weekendBoost = 0.18;       // mặc định +18% cuối tuần

    @Column(nullable = false)
    private double minorHolidayBoost = 0.25;  // mặc định +25% lễ nhỏ

    @Column(nullable = false)
    private double majorHolidayBoost = 0.55;  // mặc định +55% lễ lớn

    // ── Học từ phản hồi partner ──────────────────────────────────────────────
    /**
     * Hệ số tích cực giá [0.75 – 1.25]. <1 = thận trọng hơn, >1 = cao hơn
     */
    @Column(nullable = false)
    private double priceAggressiveness = 1.0; // giá cạnh tranh  mặc định 1.0 = trung lập
    /**
     * Partner thường điều chỉnh giá bao nhiêu (e.g. 0.95 = hay -5%)
     */
    @Column(nullable = false)
    private double partnerPriceAdjustment = 1.0; // giá partner chọn sửa- mặc định 1.0 = không điều chỉnh

    // ── Công suất lịch sử trung bình (học từ booking thực tế) ───────────────
    @Column
    private Double avgWeekdayOcc;   // null = chưa đủ dữ liệu

    @Column
    private Double avgWeekendOcc;

    // ── Metadata chất lượng model ────────────────────────────────────────────
    @Column(nullable = false)
    private int trainingDataPoints = 0; // số phản hồi đã dùng để huấn luyện

    @Column(nullable = false)
    private double lastAcceptanceRate = 0.0; // tỉ lệ chấp nhận giá của partner trong dữ liệu huấn luyện

    @Column(nullable = false)
    private int trainingRound = 0; // đã huấn luyện bao nhiêu lần

    @Column
    private LocalDateTime lastTrainedAt;    // thời điểm huấn luyện lần cuối

    @Column(nullable = false)
    private boolean hasSufficientData = false;   // đủ data để đưa ra đề xuất giá

//     ── Logistic Regression: P(partner chấp nhận giá) ────────────────────────
//    Features: [bias, priceUplift, isWeekend, isHoliday, sin(dow), cos(dow)] // dow = day of week (0-6) để capture pattern theo tuần
//    Dùng để tìm giá tối ưu: argmax_{price} (price × P(accept | price, context))
//    Loss: binary cross-entropy | Optimizer: gradient descent + L2 regularization
//    bias 	:  base probability xác xuất
//    priceUplift  :  giá tăng bao nhiêu
//    isWeekend	 :  có phải cuối tuần
//    isHoliday	: có phải lễ
//    sin/cos(dow)	: pattern theo thứ trong tuần


    @Column(nullable = false)
    private double lrW0 = 0.5;  // bias — prior 50%+ accept
    @Column(nullable = false)
    private double lrW1 = -2.0;  // priceUplift — giá cao → ít chấp nhận
    @Column(nullable = false)
    private double lrW2 = 0.3;  // isWeekend  // cuối tuần → dễ chấp nhận hơn
    @Column(nullable = false)
    private double lrW3 = 0.5;  // isHoliday   // ngày lễ → dễ chấp nhận hơn
    @Column(nullable = false)
    private double lrW4 = 0.0;  // sin(dayOfWeek) // khởi tạo trung lập (chưa học)
    @Column(nullable = false)
    private double lrW5 = 0.0;  // cos(dayOfWeek)  // khởi tạo trung lập (chưa học)
    @Column(nullable = false)
    private int lrTrainingSamples = 0; // số phản hồi đã dùng để huấn luyện LR
    @Column(nullable = false)
    private double lrLastLoss = 1.0; // cross-entropy (thấp = tốt)
    @Column(nullable = false)
    private boolean lrReady = false;
}



