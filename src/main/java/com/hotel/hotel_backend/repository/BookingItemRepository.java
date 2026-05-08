package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    List<BookingItem> findByBookingId(Long bookingId);

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.room.id = :roomId
              AND b.checkIn >= :from
              AND b.checkIn < :to
              AND b.status <> com.hotel.hotel_backend.entity.BookingStatus.CANCELLED
            """)
    List<BookingItem> findActiveByRoomAndCheckInRange(
            @Param("roomId") Long roomId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT bi FROM BookingItem bi
            JOIN FETCH bi.booking b
            WHERE bi.room.id = :roomId
              AND b.checkIn < :to
              AND b.checkOut > :from
              AND b.status <> com.hotel.hotel_backend.entity.BookingStatus.CANCELLED
            """)
    List<BookingItem> findCoveringRange(
            @Param("roomId") Long roomId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}