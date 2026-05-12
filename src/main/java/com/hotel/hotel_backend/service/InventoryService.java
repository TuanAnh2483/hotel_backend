package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.entity.Room;

import java.time.LocalDate;

public interface InventoryService {

    /**
     * Khởi tạo tồn kho cho 1 room trong 365 ngày tới
     */
    void generateInventory(Room room);

    void initInventory(Long roomId,
                       LocalDate startDate,
                       LocalDate endDate,
                       int totalRooms);

    boolean checkAvailability(Long roomId,
                              LocalDate checkIn,
                              LocalDate checkOut,
                              int quantity);

    void reserveInventory(Long roomId,
                          LocalDate checkIn,
                          LocalDate checkOut,
                          int quantity);

    void releaseInventory(Long roomId,
                          LocalDate checkIn,
                          LocalDate checkOut,
                          int quantity);
}
