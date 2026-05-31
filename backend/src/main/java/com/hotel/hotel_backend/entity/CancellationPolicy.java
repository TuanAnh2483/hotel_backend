package com.hotel.hotel_backend.entity;

public enum CancellationPolicy {
    FLEXIBLE,   // Hủy miễn phí trước 24h
    MODERATE,   // Hủy miễn phí trước 7 ngày
    STRICT      // Không hoàn tiền khi hủy
}