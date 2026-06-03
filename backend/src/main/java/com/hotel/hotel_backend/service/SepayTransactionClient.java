package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.config.PaymentProperties;
import com.hotel.hotel_backend.dto.response.SepayTransactionListResponse;
import com.hotel.hotel_backend.dto.response.SepayTransactionListResponse.SepayTransaction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Client gọi SePay Transaction API để đối soát chủ động (reconciliation).
 *
 * Webhook là nguồn xác nhận realtime nhưng có thể bị miss (server restart, timeout,
 * URL cấu hình sai). Khi customer bấm "Tôi đã chuyển khoản", backend dùng client này
 * hỏi thẳng SePay danh sách giao dịch gần đây để tự đối soát thay vì chờ webhook.
 *
 * Nếu chưa cấu hình apiToken hoặc lỗi mạng, trả danh sách rỗng để không làm vỡ
 * luồng bấm nút (frontend vẫn fallback về việc đọc lại trạng thái booking).
 */
@Service
@Slf4j
public class SepayTransactionClient {

    private final PaymentProperties paymentProperties;
    private final RestClient restClient;

    public SepayTransactionClient(PaymentProperties paymentProperties) {
        this.paymentProperties = paymentProperties;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));

        String baseUrl = paymentProperties.getSepay().getApiBaseUrl();
        this.restClient = RestClient.builder()
                .baseUrl(StringUtils.hasText(baseUrl) ? baseUrl.trim() : "https://my.sepay.vn")
                .requestFactory(factory)
                .build();
    }

    /**
     * Lấy các giao dịch tiền vào gần đây của tài khoản với số tiền cho trước.
     * Filter theo account_number + amount_in để thu hẹp; việc khớp paymentCode
     * trong nội dung do caller (service reconcile) xử lý.
     */
    public List<SepayTransaction> findIncomingTransactions(String accountNumber, long amountIn) {
        String apiToken = paymentProperties.getSepay().getApiToken();
        if (!StringUtils.hasText(apiToken)) {
            log.warn("SePay reconcile skipped: PAYMENT_SEPAY_API_TOKEN chưa được cấu hình");
            return List.of();
        }

        try {
            SepayTransactionListResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/userapi/transactions/list")
                            .queryParam("account_number", accountNumber)
                            .queryParam("amount_in", amountIn)
                            .queryParam("limit", 20)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiToken.trim())
                    .retrieve()
                    .body(SepayTransactionListResponse.class);

            if (response == null || response.transactions() == null) {
                return List.of();
            }
            return response.transactions();
        } catch (Exception exception) {
            log.warn("SePay transaction API call failed: {}", exception.getMessage());
            return List.of();
        }
    }
}
