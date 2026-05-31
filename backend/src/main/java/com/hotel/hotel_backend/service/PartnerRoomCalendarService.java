package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.PartnerRoomCalendarUpsertRequest;
import com.hotel.hotel_backend.dto.response.PartnerRoomCalendarDayResponse;
import com.hotel.hotel_backend.dto.response.PartnerRoomCalendarResponse;
import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.DailyInventoryId;
import com.hotel.hotel_backend.entity.DailyRate;
import com.hotel.hotel_backend.entity.DailyRateId;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.repository.DailyRateRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class PartnerRoomCalendarService {

    private final RoomRepository roomRepository;
    private final DailyRateRepository dailyRateRepository;
    private final DailyInventoryRepository dailyInventoryRepository;
    private final InventoryService inventoryService;
    private final SecurityService securityService;

    /**
     * Calendar read tra ve snapshot tung ngay trong range de partner nhin duoc
     * gia, tinh trang dong phong va ton kho dang ban.
     */
    @Transactional(readOnly = true)
    public PartnerRoomCalendarResponse getCalendar(Long roomId, LocalDate from, LocalDate to) {
        Room room = loadOwnedRoom(roomId);
        validateRange(from, to);

        Map<LocalDate, DailyRate> ratesByDate = dailyRateRepository
                .findByIdRoomIdAndIdDateBetween(roomId, from, to)
                .stream()
                .collect(LinkedHashMap::new, (map, rate) -> map.put(rate.getId().date(), rate), Map::putAll);

        Map<LocalDate, DailyInventory> inventoriesByDate = dailyInventoryRepository
                .findByIdRoomIdAndIdDateBetween(roomId, from, to)
                .stream()
                .collect(LinkedHashMap::new, (map, inventory) -> map.put(inventory.getId().getDate(), inventory), Map::putAll);

        return buildCalendarResponse(room, from, to, ratesByDate, inventoriesByDate);
    }

    /**
     * Calendar upsert cho phep patch mot block ngay ma khong phai gui tung row.
     * Field nao null thi giu nguyen gia tri hien co.
     */
    public PartnerRoomCalendarResponse upsertCalendar(Long roomId, PartnerRoomCalendarUpsertRequest request) {
        Room room = loadOwnedRoom(roomId);
        validateRange(request.startDate(), request.endDate());
        validateUpsertRequest(room, request);

        LocalDate from = request.startDate();
        LocalDate to = request.endDate();

        // Upsert inventory can dam bao range ton tai truoc khi patch so luong tung ngay.
        inventoryService.initInventory(roomId, from, to.plusDays(1), room.getQuantity());

        Map<LocalDate, DailyRate> ratesByDate = dailyRateRepository
                .findByIdRoomIdAndIdDateBetween(roomId, from, to)
                .stream()
                .collect(LinkedHashMap::new, (map, rate) -> map.put(rate.getId().date(), rate), Map::putAll);

        Map<LocalDate, DailyInventory> inventoriesByDate = dailyInventoryRepository
                .findByIdRoomIdAndIdDateBetween(roomId, from, to)
                .stream()
                .collect(LinkedHashMap::new, (map, inventory) -> map.put(inventory.getId().getDate(), inventory), Map::putAll);

        List<DailyRate> ratesToSave = new ArrayList<>();
        List<DailyInventory> inventoriesToSave = new ArrayList<>();

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (touchesRate(request)) {
                DailyRate rate = ratesByDate.get(date);
                if (rate == null) {
                    rate = new DailyRate();
                    rate.setId(new DailyRateId(roomId, date));
                    rate.setRoom(room);
                    rate.setPrice(room.getPrice());
                    rate.setMinStay(null);
                    rate.setClosed(false);
                }

                if (request.price() != null) {
                    rate.setPrice(request.price());
                }
                if (request.minStay() != null) {
                    rate.setMinStay(request.minStay());
                }
                if (request.closed() != null) {
                    rate.setClosed(request.closed());
                    if (!request.closed()) {
                        rate.setCloseReason(null);
                    } else if (request.closeReason() != null) {
                        rate.setCloseReason(request.closeReason());
                    }
                } else if (request.closeReason() != null && rate.isClosed()) {
                    rate.setCloseReason(request.closeReason());
                }

                ratesByDate.put(date, rate);
                ratesToSave.add(rate);
            }

            if (request.availableRooms() != null) {
                DailyInventory inventory = inventoriesByDate.get(date);
                if (inventory == null) {
                    inventory = new DailyInventory();
                    inventory.setId(new DailyInventoryId(roomId, date));
                    inventory.setRoom(room);
                    inventory.setAvailableRooms(room.getQuantity());
                    inventory.setBlockedRooms(0);
                }

                if (request.availableRooms() < inventory.getBlockedRooms()) {
                    throw new ApiException(
                            ErrorCode.CONFLICT,
                            "availableRooms cannot be less than blocked rooms"
                    );
                }

                inventory.setAvailableRooms(request.availableRooms());
                inventoriesByDate.put(date, inventory);
                inventoriesToSave.add(inventory);
            }
        }

        if (!ratesToSave.isEmpty()) {
            dailyRateRepository.saveAll(ratesToSave);
        }
        if (!inventoriesToSave.isEmpty()) {
            dailyInventoryRepository.saveAll(inventoriesToSave);
        }

        return buildCalendarResponse(room, from, to, ratesByDate, inventoriesByDate);
    }

    /**
     * Sets base pricing (price + optional minStay) for every room of a hotel
     * over a 1-year window starting from today.
     * Used by AddPropertyWizard on final submit to avoid N individual room calls.
     */
    public void setHotelBasePricing(Long hotelId, long basePrice, Integer minStay) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        List<Room> rooms = roomRepository.findByHotelIdAndHotelOwnerId(hotelId, ownerId);
        if (rooms.isEmpty()) {
            throw new ApiException(ErrorCode.NOT_FOUND, "No rooms found for hotel");
        }

        LocalDate from = LocalDate.now();
        LocalDate to   = from.plusYears(1);

        for (Room room : rooms) {
            PartnerRoomCalendarUpsertRequest req = new PartnerRoomCalendarUpsertRequest(
                    from, to, basePrice, minStay, null, null, null
            );
            upsertCalendar(room.getId(), req);
        }
    }

    private PartnerRoomCalendarResponse buildCalendarResponse(
            Room room,
            LocalDate from,
            LocalDate to,
            Map<LocalDate, DailyRate> ratesByDate,
            Map<LocalDate, DailyInventory> inventoriesByDate
    ) {
        List<PartnerRoomCalendarDayResponse> items = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            DailyRate rate = ratesByDate.get(date);
            DailyInventory inventory = inventoriesByDate.get(date);

            long effectivePrice = rate != null ? rate.getPrice() : room.getPrice();
            Integer availableRooms = inventory != null ? inventory.getAvailableRooms() : room.getQuantity();
            Integer blockedRooms = inventory != null ? inventory.getBlockedRooms() : 0;

            items.add(new PartnerRoomCalendarDayResponse(
                    date,
                    effectivePrice,
                    rate != null ? rate.getMinStay() : null,
                    rate != null && rate.isClosed(),
                    availableRooms,
                    blockedRooms,
                    availableRooms - blockedRooms,
                    rate != null,
                    inventory != null,
                    rate != null ? rate.getCloseReason() : null
            ));
        }

        return new PartnerRoomCalendarResponse(
                room.getId(),
                room.getName(),
                room.getHotel().getId(),
                room.getPrice(),
                room.getQuantity(),
                from,
                to,
                items
        );
    }

    private Room loadOwnedRoom(Long roomId) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        return roomRepository.findByIdAndHotelOwnerId(roomId, ownerId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Room not found"));
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Invalid calendar date range");
        }
    }

    private void validateUpsertRequest(Room room, PartnerRoomCalendarUpsertRequest request) {
        if (!touchesRate(request) && request.availableRooms() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "At least one calendar field is required");
        }

        if (request.availableRooms() != null && request.availableRooms() > room.getQuantity()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "availableRooms cannot be greater than room quantity"
            );
        }
    }

    private boolean touchesRate(PartnerRoomCalendarUpsertRequest request) {
        return request.price() != null || request.minStay() != null || request.closed() != null;
    }
}
