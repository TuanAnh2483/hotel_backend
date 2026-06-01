package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.PriceFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PriceFeedbackRepository extends JpaRepository<PriceFeedback, Long> {

    List<PriceFeedback> findTop10ByRoomIdOrderByCreatedAtDesc(Long roomId); // Dùng cho hiển thị feedback mới nhất ở frontend

    // Dùng cho training: toàn bộ feedback của phòng trong khoảng thời gian
    List<PriceFeedback> findByRoomIdAndCreatedAtAfterOrderByCreatedAtDesc(Long roomId, LocalDateTime since);   // Lấy feedback của phòng từ thời điểm "since" đến nay, sắp xếp mới nhất trước

    long countByRoomIdAndCreatedAtAfter(Long roomId, LocalDateTime since);  // Đếm số feedback của phòng từ thời điểm "since" đến nay (dùng để đánh giá có đủ dữ liệu để train không)

    long countByRoomIdAndOutcomeAndCreatedAtAfter(Long roomId, String outcome, LocalDateTime since);    // Đếm số feedback có outcome cụ thể (e.g. APPLIED) của phòng từ thời điểm "since" đến nay (dùng để tính acceptance rate)
}
