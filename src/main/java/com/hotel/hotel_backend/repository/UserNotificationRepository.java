package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.UserNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserNotification> findByIdAndUserId(Long id, Long userId);

    Optional<UserNotification> findByUserIdAndTypeAndBookingId(Long userId, String type, Long bookingId);

    @Query("""
            select n.bookingId
            from UserNotification n
            where n.userId = :userId
              and n.type = :type
              and n.bookingId in :bookingIds
            """)
    List<Long> findExistingBookingIds(
            @Param("userId") Long userId,
            @Param("type") String type,
            @Param("bookingIds") Collection<Long> bookingIds
    );
}
