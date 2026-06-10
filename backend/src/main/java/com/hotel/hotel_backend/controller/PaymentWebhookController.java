package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.SepayWebhookRequest;
import com.hotel.hotel_backend.dto.response.SepayWebhookResponse;
import com.hotel.hotel_backend.service.BookingPaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Payment Webhooks", description = "SePay bank-transfer webhook callbacks (internal use)")
@RestController
@RequestMapping({"/api/v1/payments/webhooks", "/api/payments/webhooks"})
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final BookingPaymentGatewayService bookingPaymentGatewayService;

    /*
     * Endpoint public để SePay gọi khi tài khoản ngân hàng nhận được tiền.
     *
     * Route này không dùng JWT vì request đến từ hệ thống SePay chứ không phải user.
     * SecurityConfig permitAll endpoint này; service tự xác thực bằng header
     * Authorization: Apikey <key> (PAYMENT_SEPAY_WEBHOOK_API_KEY).
     *
     * Idempotency: SePay có thể retry webhook nhiều lần (network timeout, etc.).
     * Service xử lý an toàn nhờ 3 lớp:
     *   1. Check gateway_transaction_id đã tồn tại trong DB → bỏ qua nếu trùng
     *   2. Check transaction.status == SUCCESS → không xử lý lại
     *   3. UNIQUE constraint trên gateway_transaction_id ở tầng DB
     */
    @PostMapping("/sepay")
    public SepayWebhookResponse handleSepayWebhook(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody SepayWebhookRequest request
    ) {
        return bookingPaymentGatewayService.handleSepayWebhook(authorizationHeader, request);
    }
}
