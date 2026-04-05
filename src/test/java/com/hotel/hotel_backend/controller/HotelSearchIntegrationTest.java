package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HotelSearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private DailyInventoryRepository dailyInventoryRepository;

    @Autowired
    private InventoryService inventoryService;

    private LocalDate checkIn;
    private LocalDate checkOut;

    @BeforeEach
    void setUp() {
        // Moi test tu setup lai DB de khong bi phu thuoc vao du lieu cua test khac.
        // checkIn/checkOut duoc co dinh tu day de toan bo helper method dung chung.
        dailyInventoryRepository.deleteAll();
        roomRepository.deleteAll();
        hotelRepository.deleteAll();
        userRepository.deleteAll();

        checkIn = LocalDate.now().plusDays(1);
        checkOut = checkIn.plusDays(2);
    }

    @Test
    void searchShouldReturnHotelsWithAvailableRooms() throws Exception {
        // Case 1:
        // Tao 1 hotel dung location, co 1 room active, co inventory day du cho ca ky o.
        // Khi goi API search, hotel nay phai xuat hien trong ket qua.
        User owner = createOwner("owner-available@test.com");

        Hotel hotel = createHotel(owner, "Available Hotel", "Bangkok", "District 1");
        Room room = createRoom(hotel, "Standard Room", 2);
        initInventory(room);

        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("adults", "2")
                        .param("rooms", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].hotelId").value(hotel.getId()))
                .andExpect(jsonPath("$.data[0].name").value("Available Hotel"));
    }

    @Test
    void searchShouldExcludeHotelsWithoutAvailability() throws Exception {
        // Case 2:
        // Tao 2 hotel cung location.
        // Hotel thu nhat con phong, hotel thu hai bi block het inventory.
        // Ket qua search chi duoc tra ve hotel con phong.
        User owner = createOwner("owner-soldout@test.com");

        Hotel availableHotel = createHotel(owner, "Available Hotel", "Bangkok", "District 1");
        Room availableRoom = createRoom(availableHotel, "Available Room", 2);
        initInventory(availableRoom);

        Hotel soldOutHotel = createHotel(owner, "Sold Out Hotel", "Bangkok", "District 1");
        Room soldOutRoom = createRoom(soldOutHotel, "Sold Out Room", 1);
        initInventory(soldOutRoom);
        blockInventory(soldOutRoom, 1);

        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("adults", "2")
                        .param("rooms", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].hotelId").value(availableHotel.getId()))
                .andExpect(jsonPath("$.data[0].name").value("Available Hotel"));
    }

    @Test
    void searchShouldReturnBadRequestWhenDatesMissing() throws Exception {
        // Case 3:
        // Thieu checkIn/checkOut phai bi chan ngay o boundary validation
        // va tra ve 400 thay vi roi xuong logic search.
        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("adults", "2")
                        .param("rooms", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    private User createOwner(String email) {
        // Tao partner de gan lam owner cho hotel test.
        User owner = new User();
        owner.setEmail(email);
        owner.setPasswordHash("hash-owner");
        owner.setUserType(UserType.PARTNER);
        return userRepository.save(owner);
    }

    private Hotel createHotel(User owner, String name, String province, String district) {
        // Tao hotel voi location cu the de test filter province/district.
        Hotel hotel = new Hotel();
        hotel.setOwner(owner);
        hotel.setName(name);
        hotel.setAddress(name + " address");
        hotel.setProvince(province);
        hotel.setDistrict(district);
        return hotelRepository.save(hotel);
    }

    private Room createRoom(Hotel hotel, String name, int quantity) {
        // Tao room active mac dinh. quantity la tong so phong cua room type nay.
        Room room = new Room();
        room.setHotel(hotel);
        room.setName(name);
        room.setPrice(1_000_000L);
        room.setCapacity(2);
        room.setQuantity(quantity);
        return roomRepository.save(room);
    }

    private void initInventory(Room room) {
        // Search chi coi room la available khi moi ngay trong ky o deu co inventory.
        // Helper nay tao inventory cho [checkIn, checkOut).
        inventoryService.initInventory(room.getId(), checkIn, checkOut, room.getQuantity());
    }

    private void blockInventory(Room room, int blockedRooms) {
        // Block cung mot so luong phong tren tung ngay trong ky o.
        // Neu blockedRooms = quantity thi room van active nhung khong con kha dung de dat.
        List<DailyInventory> inventories = dailyInventoryRepository.findByIdRoomIdAndIdDateBetween(
                room.getId(),
                checkIn,
                checkOut.minusDays(1)
        );

        for (DailyInventory inventory : inventories) {
            inventory.setBlockedRooms(blockedRooms);
        }

        dailyInventoryRepository.saveAll(inventories);
    }
}
