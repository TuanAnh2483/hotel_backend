package com.hotel.hotel_backend.dto.response;

import java.util.List;

public record ApiError(
        String code,
        String message,
        List<FieldErrorItem> details
) {
    public record FieldErrorItem(String field, String message) {}
}

