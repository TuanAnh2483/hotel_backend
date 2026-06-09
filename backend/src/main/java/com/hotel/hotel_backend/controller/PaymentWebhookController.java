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
     * Vì vậy SecurityConfig permitAll endpoint này, sau đó service tự kiểm tra
     * header Authorization: Apikey <key> để đảm bảo request thật sự đến từ webhook
     * mà mình đã cấu hình trên SePay.
     */
    @PostMapping("/sepay")
    public SepayWebhookResponse handleSepayWebhook(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody SepayWebhookRequest request
    ) {
        return bookingPaymentGatewayService.handleSepayWebhook(authorizationHeader, request);
    }
}
