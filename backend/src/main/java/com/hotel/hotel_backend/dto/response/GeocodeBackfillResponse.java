package com.hotel.hotel_backend.dto.response;

/**
 * Kết quả chạy backfill geocoding cho các khách sạn chưa có toạ độ.
 * total   = số khách sạn thiếu toạ độ trước khi chạy
 * updated = số khách sạn geocode thành công và đã lưu toạ độ
 * failed  = số khách sạn geocode không ra kết quả (cần nhập tay)
 */
public record GeocodeBackfillResponse(int total, int updated, int failed) {}
