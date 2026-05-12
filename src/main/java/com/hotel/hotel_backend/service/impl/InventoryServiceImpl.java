package com.hotel.hotel_backend.service.impl;

import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.DailyInventoryId;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.service.InventoryService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private static final int DEFAULT_INVENTORY_DAYS = 365;

    private final DailyInventoryRepository dailyInventoryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Khởi tạo tồn kho cho 1 room trong 365 ngày tới (bắt đầu từ hôm nay)
     */
    @Override
    @Transactional
    public void generateInventory(Room room) {
        LocalDate today = LocalDate.now();
        initInventory(room.getId(), today, today.plusDays(DEFAULT_INVENTORY_DAYS), room.getQuantity());
    }

    @Override
    @Transactional
    public void initInventory(Long roomId,
                              LocalDate startDate,
                              LocalDate endDate,
                              int totalRooms) {
        // Không tạo nếu range không hợp lệ.
        if (startDate == null || endDate == null || !endDate.isAfter(startDate)) {
            return;
        }

        List<DailyInventory> existing = dailyInventoryRepository.findByIdRoomIdAndIdDateBetween(
                roomId,
                startDate,
                endDate.minusDays(1)
        );

        Set<LocalDate> existingDates = new HashSet<>();
        for (DailyInventory inventory : existing) {
            existingDates.add(inventory.getId().getDate());
        }

        Room roomRef = entityManager.getReference(Room.class, roomId);
        List<DailyInventory> toCreate = new ArrayList<>();

        // Chỉ tạo các ngày còn thiếu trong khoảng [startDate, endDate).
        for (LocalDate date = startDate; date.isBefore(endDate); date = date.plusDays(1)) {
            if (existingDates.contains(date)) {
                continue;
            }

            DailyInventory inventory = new DailyInventory();
            inventory.setId(new DailyInventoryId(roomId, date));
            inventory.setRoom(roomRef);
            inventory.setAvailableRooms(totalRooms);
            inventory.setBlockedRooms(0);
            toCreate.add(inventory);
        }

        if (!toCreate.isEmpty()) {
            dailyInventoryRepository.saveAll(toCreate);
        }
    }

    @Override
    public boolean checkAvailability(Long roomId,
                                     LocalDate checkIn,
                                     LocalDate checkOut,
                                     int quantity) {
        long nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) {
            return false;
        }

        List<DailyInventory> inventories = loadInventories(roomId, checkIn, checkOut);
        if (!isCompleteRange(nights, inventories)) {
            return false;
        }

        return hasEnoughRooms(inventories, quantity);
    }

    @Override
    @Transactional
    public void reserveInventory(Long roomId,
                                 LocalDate checkIn,
                                 LocalDate checkOut,
                                 int quantity) {
        long nights = requireValidRangeForReserve(checkIn, checkOut);

        List<DailyInventory> inventories = loadInventories(roomId, checkIn, checkOut);
        ensureCompleteRangeForReserve(nights, inventories);

        if (!hasEnoughRooms(inventories, quantity)) {
            throw new ApiException(ErrorCode.CONFLICT, "Not enough rooms available");
        }

        // Đánh dấu phòng đã bị giữ.
        for (DailyInventory inventory : inventories) {
            inventory.setBlockedRooms(inventory.getBlockedRooms() + quantity);
        }

        dailyInventoryRepository.saveAll(inventories);
    }

    @Override
    @Transactional
    public void releaseInventory(Long roomId,
                                 LocalDate checkIn,
                                 LocalDate checkOut,
                                 int quantity) {
        long nights = requireValidRangeForRelease(checkIn, checkOut);

        List<DailyInventory> inventories = loadInventories(roomId, checkIn, checkOut);
        ensureCompleteRangeForRelease(nights, inventories);

        // Trả lại số phòng đã giữ, không cho phép âm.
        for (DailyInventory inventory : inventories) {
            int nextBlocked = inventory.getBlockedRooms() - quantity;
            if (nextBlocked < 0) {
                throw new ApiException(ErrorCode.CONFLICT, "Inventory release underflow");
            }
            inventory.setBlockedRooms(nextBlocked);
        }

        dailyInventoryRepository.saveAll(inventories);
    }

    private List<DailyInventory> loadInventories(Long roomId, LocalDate checkIn, LocalDate checkOut) {
        return dailyInventoryRepository.findByIdRoomIdAndIdDateBetween(
                roomId,
                checkIn,
                checkOut.minusDays(1)
        );
    }

    private long nightsBetween(LocalDate checkIn, LocalDate checkOut) {
        return ChronoUnit.DAYS.between(checkIn, checkOut);
    }

    private boolean isCompleteRange(long nights, List<DailyInventory> inventories) {
        return inventories.size() == nights;
    }

    private boolean hasEnoughRooms(List<DailyInventory> inventories, int quantity) {
        return inventories.stream().allMatch(inv ->
                inv.getAvailableRooms() - inv.getBlockedRooms() >= quantity
        );
    }

    private long requireValidRangeForReserve(LocalDate checkIn, LocalDate checkOut) {
        long nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) {
            throw new IllegalArgumentException("Invalid date range");
        }
        return nights;
    }

    private long requireValidRangeForRelease(LocalDate checkIn, LocalDate checkOut) {
        long nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Invalid date range");
        }
        return nights;
    }

    private void ensureCompleteRangeForReserve(long nights, List<DailyInventory> inventories) {
        if (!isCompleteRange(nights, inventories)) {
            throw new IllegalStateException("Inventory data incomplete for given range");
        }
    }

    private void ensureCompleteRangeForRelease(long nights, List<DailyInventory> inventories) {
        if (!isCompleteRange(nights, inventories)) {
            throw new ApiException(ErrorCode.CONFLICT, "Inventory data incomplete for given range");
        }
    }
}
