package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.PriceSuggestionFeedbackRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.PriceSuggestionResponse;
import com.hotel.hotel_backend.dto.response.RevenueAnalyticsResponse;
import com.hotel.hotel_backend.dto.response.TrainResultResponse;
import com.hotel.hotel_backend.service.price.PriceSuggestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/partner/rooms/{roomId}")
@RequiredArgsConstructor
public class PriceSuggestionController {

    private final PriceSuggestionService priceSuggestionService;

    /**
     * Lấy đề xuất giá AI cho phòng trong khoảng ngày.
     * GET /api/partner/rooms/{roomId}/price-suggestions?from=2026-05-09&to=2026-05-16
     */
    @GetMapping("/price-suggestions")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PriceSuggestionResponse> getSuggestions(
            @PathVariable Long roomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(priceSuggestionService.getSuggestions(roomId, from, to));
    }

    /**
     * Partner ghi nhận quyết định sau khi xem đề xuất AI.
     * POST /api/partner/rooms/{roomId}/price-feedback
     * Body: { "roomId", "date", "suggested", "appliedPrice", "outcome" }
     */
    @PostMapping("/price-feedback")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<Void> recordFeedback(
            @PathVariable Long roomId,
            @Valid @RequestBody PriceSuggestionFeedbackRequest request
    ) {
        priceSuggestionService.recordFeedback(
                roomId,
                request.date(),
                request.suggested(),
                request.appliedPrice(),
                request.outcome()
        );
        return ApiResponse.ok(null);
    }

    /**
     * Phân tích doanh thu 28 ngày gần nhất cho phòng.
     * GET /api/partner/rooms/{roomId}/revenue-analytics
     */
    @GetMapping("/revenue-analytics")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RevenueAnalyticsResponse> getRevenueAnalytics(
            @PathVariable Long roomId
    ) {
        return ApiResponse.ok(priceSuggestionService.getRevenueAnalytics(roomId));
    }

    /**
     * Kích hoạt huấn luyện model AI thủ công cho phòng.
     * POST /api/partner/rooms/{roomId}/train
     */
    @PostMapping("/train")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<TrainResultResponse> triggerTraining(
            @PathVariable Long roomId
    ) {
        return ApiResponse.ok(priceSuggestionService.triggerTraining(roomId));
    }
}