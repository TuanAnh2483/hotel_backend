package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.entity.RoomStatus;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import jakarta.validation.constraints.AssertTrue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HotelAvailabilityService {

    private final RoomRepository roomRepository;
    private final DailyInventoryRepository dailyInventoryRepository;

   ///  điều kiện khi filter date time
   public boolean isDateRangeValid(HotelSearchCriteria criteria) {
       // 1. Chặn ngay nếu một trong hai ngày bị null
       if (criteria.checkIn() == null || criteria.checkOut() == null) {
           return false;
       }

       // 2. Chặn nếu ngày nhận phòng ở quá khứ (Tùy chọn nhưng nên có)
       if (criteria.checkIn().isBefore(LocalDate.now())) {
           return false;
       }

       // 3. Quan trọng: CheckOut PHẢI SAU CheckIn (không chấp nhận bằng nhau)
       // Nếu checkIn = 2026-04-10 và checkOut = 2026-04-10 -> isAfter sẽ trả về false -> Hợp lệ!
       return criteria.checkOut().isAfter(criteria.checkIn());
   }

    public List<Hotel> filterAvailableHotels(List<Hotel> hotels, HotelSearchCriteria criteria) {
        if (hotels.isEmpty()) {
            return List.of();
        }


        List<Long> hotelIds = hotels.stream()
                .map(Hotel::getId)
                .toList();
        if (criteria.checkIn() == null || criteria.checkOut() == null) {
            return List.of();
        }
        boolean dateValid = isDateRangeValid(criteria);
        if (dateValid) {
        }



        // Phase 1: searchable hotels must have at least one active room.
        List<Room> activeRooms = roomRepository.findByHotelIdInAndStatus(
                hotelIds,
                RoomStatus.ACTIVE
        );
        List<Room> availableRooms = activeRooms.stream()
                .filter(room-> isRoomAvailable(room,criteria))
                .toList();



        Set<Long> hotelIdsWithAvailableRooms = activeRooms.stream()
                .map(room -> room.getHotel().getId())
                .collect(Collectors.toSet());

        return hotels.stream()
                .filter(hotel -> hotelIdsWithAvailableRooms.contains(hotel.getId()))
                .toList();
    }

    private boolean isRoomAvailable(Room room, HotelSearchCriteria criteria) {
        // load inventories theo room + khoảng ngày
            List<DailyInventory> inventories = dailyInventoryRepository.findByIdRoomIdAndIdDateBetween(
                    room.getId(),
                    criteria.checkIn(),
                    criteria.checkOut().minusDays(1)

            );

            Long nigth = ChronoUnit.DAYS.between(criteria.checkIn(), criteria.checkOut());

            // kiểm tra đủ số ngày
        if(inventories.size() != nigth) {
                return false;
            }

        // kiểm tra mỗi ngày availableRooms - blockedRooms >= criteria.rooms()
        return inventories.stream()
                .allMatch(inventory ->
                        inventory.getAvailableRooms()-inventory.getBlockedRooms()>= criteria.rooms());
    }


}
