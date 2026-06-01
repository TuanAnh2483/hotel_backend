package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.DailyInventoryId;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface DailyInventoryRepository
        extends JpaRepository<DailyInventory, DailyInventoryId> {

    List<DailyInventory> findByIdRoomIdAndIdDateBetween(
            Long roomId,
            LocalDate start,
            LocalDate end
    );

    List<DailyInventory> findByIdRoomIdInAndIdDateBetween(
            List<Long> roomIds,
            LocalDate start,
            LocalDate end
    );

    void deleteByIdRoomId(Long roomId);

    void deleteByIdRoomIdIn(List<Long> roomIds);

    // TASK-1: Find stale rows where availableRooms drifted above Room.quantity.
    // Pageable keeps batch size bounded so the repair runner never OOMs on large datasets.
    @Query("SELECT di FROM DailyInventory di WHERE di.availableRooms > di.room.quantity")
    List<DailyInventory> findStaleRows(Pageable pageable);

    @Query("SELECT COUNT(di) FROM DailyInventory di WHERE di.availableRooms > di.room.quantity")
    long countStaleRows();
}

