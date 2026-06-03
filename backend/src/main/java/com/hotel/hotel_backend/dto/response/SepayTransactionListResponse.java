package com.hotel.hotel_backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Phản hồi từ SePay Transaction API: GET /userapi/transactions/list.
 *
 * SePay trả số tiền dưới dạng chuỗi ("50000.00"), nên giữ String và parse khi đối soát.
 */
public record SepayTransactionListResponse(
        String status,
        Object messages,
        List<SepayTransaction> transactions
) {

    public record SepayTransaction(
            String id,
            @JsonProperty("transaction_date") String transactionDate,
            @JsonProperty("account_number") String accountNumber,
            @JsonProperty("amount_in") String amountIn,
            @JsonProperty("amount_out") String amountOut,
            @JsonProperty("transaction_content") String transactionContent,
            @JsonProperty("reference_number") String referenceNumber,
            String code,
            @JsonProperty("sub_account") String subAccount
    ) {}
}
