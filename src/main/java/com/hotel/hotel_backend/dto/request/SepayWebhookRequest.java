package com.hotel.hotel_backend.dto.request;

public record SepayWebhookRequest(
        Long id,
        String gateway,
        String transactionDate,
        String accountNumber,
        String code,
        String content,
        String transferType,  //"in" or "out"
        Double transferAmount,
        Double accumulated,
        String subAccount,
        String referenceCode,
        String description
) {}
