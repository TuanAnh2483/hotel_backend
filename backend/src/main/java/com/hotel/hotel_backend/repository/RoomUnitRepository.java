package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.RoomUnit;
import com.hotel.hotel_backend.entity.RoomUnitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RoomUnitRepository extends JpaRepository<RoomUnit, Long> {

    List<RoomUnit> findByRoomIdOrderByFloorAscRoomNumberAsc(Long roomId);

    long countByRoomId(Long roomId);

    long countByRoomIdAndStatus(Long roomId, RoomUnitStatus status);

    long countByRoomIdAndStatusIn(Long roomId, Collection<RoomUnitStatus> statuses);

    boolean existsByRoomIdAndRoomNumber(Long roomId, String roomNumber);

    Optional<RoomUnit> findByIdAndRoomId(Long id, Long roomId);

    List<RoomUnit> findByRoomIdAndStatusOrderByCreatedAtAsc(Long roomId, RoomUnitStatus status);

    List<RoomUnit> findByRoomIdAndStatusInOrderByCreatedAtAsc(Long roomId, Collection<RoomUnitStatus> statuses);

    void deleteByRoomId(Long roomId);

    @Query("""
            SELECT COUNT(u) FROM RoomUnit u
            WHERE u.room.hotel.id = :hotelId
              AND u.roomNumber = :roomNumber
              AND (:excludeUnitId IS NULL OR u.id <> :excludeUnitId)
            """)
    long countByHotelIdAndRoomNumber(
            @Param("hotelId") Long hotelId,
            @Param("roomNumber") String roomNumber,
            @Param("excludeUnitId") Long excludeUnitId);

    @Query("""
            SELECT u FROM RoomUnit u
            JOIN FETCH u.room r
            WHERE r.hotel.id = :hotelId
              AND r.status <> 'INACTIVE'
            ORDER BY r.name, u.floor, u.roomNumber
            """)
    List<RoomUnit> findByHotelId(@Param("hotelId") Long hotelId);

    long countByRoomIdAndStatusNot(Long roomId, RoomUnitStatus status);

    @Query("SELECT u FROM RoomUnit u WHERE u.notes LIKE :prefix AND u.status IN :statuses")
    List<RoomUnit> findByNotesStartingWithAndStatusIn(
            @Param("prefix") String prefix,
            @Param("statuses") Collection<RoomUnitStatus> statuses);

    @Query("""
            SELECT u.room.id          AS roomId,
                   COUNT(u)           AS totalCount,
                   SUM(CASE WHEN u.status = 'AVAILABLE'   THEN 1 ELSE 0 END) AS availableCount,
                   SUM(CASE WHEN u.status = 'OCCUPIED'    THEN 1 ELSE 0 END) AS occupiedCount,
                   SUM(CASE WHEN u.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceCount,
                   SUM(CASE WHEN u.status = 'CLEANING'    THEN 1 ELSE 0 END) AS cleaningCount
            FROM RoomUnit u
            WHERE u.room.id IN :roomIds
            GROUP BY u.room.id
            """)
    List<RoomUnitSummaryRow> summarizeByRoomIds(@Param("roomIds") List<Long> roomIds);

    interface RoomUnitSummaryRow {
        Long getRoomId();
        long getTotalCount();
        long getAvailableCount();
        long getOccupiedCount();
        long getMaintenanceCount();
        long getCleaningCount();
    }
}
