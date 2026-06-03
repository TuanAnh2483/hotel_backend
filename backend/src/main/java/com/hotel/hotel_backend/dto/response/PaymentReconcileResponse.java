package com.hotel.hotel_backend.dto.response;

/**
 * Kết quả đối soát chủ động khi customer bấm "Tôi đã chuyển khoản".
 *
 * - bookingStatus: trạng thái booking sau khi đối soát (CONFIRMED nếu khớp giao dịch).
 * - matched: true nếu tìm thấy và xác nhận được giao dịch tương ứng từ SePay.
 */
public record PaymentReconcileResponse(
        String bookingStatus,
        boolean matched
) {}
