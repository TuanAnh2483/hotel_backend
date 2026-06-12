package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body cho /api/chat/customer và /api/chat/partner.
 * sessionId tuỳ chọn — nếu trống, backend tự sinh UUID và trả về cho client dùng lại.
 * context tuỳ chọn — ngữ cảnh trang khách đang xem (vd đang ở trang chi tiết 1 khách sạn).
 * confirm tuỳ chọn — phản hồi nút xác nhận cho thao tác ghi đang chờ của session
 * (null = tin nhắn thường; true = đồng ý thực hiện; false = huỷ).
 */
public record ChatRequest(
        @NotBlank(message = "message is required")
        @Size(max = 2000, message = "message quá dài")
        String message,

        String sessionId,

        ChatContext context,

        Boolean confirm
) {
    /**
     * Ngữ cảnh trang hiện tại. Customer: hotelId (đang xem KS nào) + lat/lng (vị trí khách,
     * cho tính năng "gần tôi"). Partner: page (tên tab đang mở) + bookingId (khi ở trang chi tiết booking).
     */
    public record ChatContext(Long hotelId, Long bookingId, String page, Double lat, Double lng) {
    }
}
