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
        // Reset DB truoc moi test de tung case doc lap nhau.
        // checkIn/checkOut duoc co dinh de helper inventory va request dung chung cung mot ky o.
        dailyInventoryRepository.deleteAll();
        roomRepository.deleteAll();
        hotelRepository.deleteAll();
        userRepository.deleteAll();

        checkIn = LocalDate.now().plusDays(1);
        checkOut = checkIn.plusDays(2);
    }

    @Test
    void searchShouldReturnHotelsWithAvailableRooms() throws Exception {
        // Contract:
        // Hotel dung location, room dang active, va inventory du cho toan bo ky o
        // thi phai duoc tra ve trong ket qua search.
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
        // Contract:
        // Hai hotel cung location nhung mot hotel bi sold-out toan bo ky o
        // thi ket qua search chi duoc giu lai hotel con phong.
        User owner = createOwner("owner-soldout@test.com");

        Hotel availableHotel = createHotel(owner, "Available Hotel", "Bangkok", "District 1");
        Room availableRoom = createRoom(availableHotel, "Available Room", 2);
        initInventory(availableRoom);

        Hotel soldOutHotel = createHotel(owner, "Sold Out Hotel", "Bangkok", "District 1");
        Room soldOutRoom = createRoom(soldOutHotel, "Sold Out Room", 1);
        initInventory(soldOutRoom);
        blockInventoryForEntireStay(soldOutRoom, 1);

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
        // Contract:
        // Request thieu checkIn/checkOut phai fail ngay o boundary validation
        // va tra 400 VALIDATION_ERROR thay vi chay vao business logic.
        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("adults", "2")
                        .param("rooms", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void searchShouldExcludeHotelsWithoutEnoughCapacityForAdults() throws Exception {
        // Contract:
        // Ca hai hotel deu du so phong user yeu cau.
        // Nhung chi hotel co tong suc chua du cho so adults moi duoc giu lai.
        User owner = createOwner("owner-capacity@test.com");

        Hotel familyHotel = createHotel(owner, "Family Hotel", "Bangkok", "District 1");
        Room familyRoomA = createRoom(familyHotel, "Family A", 1, 2);
        Room familyRoomB = createRoom(familyHotel, "Family B", 1, 2);
        initInventory(familyRoomA);
        initInventory(familyRoomB);

        Hotel lowCapacityHotel = createHotel(owner, "Low Capacity Hotel", "Bangkok", "District 1");
        Room singleRoomA = createRoom(lowCapacityHotel, "Single A", 1, 1);
        Room singleRoomB = createRoom(lowCapacityHotel, "Single B", 1, 1);
        initInventory(singleRoomA);
        initInventory(singleRoomB);

        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("checkIn", checkIn.toString())
                        .param("checkOut", checkOut.toString())
                        .param("adults", "3")
                        .param("rooms", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].hotelId").value(familyHotel.getId()))
                .andExpect(jsonPath("$.data[0].name").value("Family Hotel"));
    }

    @Test
    void searchShouldReturnBadRequestWhenCheckOutIsNotAfterCheckIn() throws Exception {
        // Contract:
        // checkOut phai sau checkIn.
        // Neu checkOut == checkIn hoac checkOut truoc checkIn thi request phai tra 400.
        LocalDate invalidCheckIn = LocalDate.now().plusDays(3);
        LocalDate invalidCheckOut = invalidCheckIn;

        mockMvc.perform(get("/api/hotels/search")
                        .param("province", "Bangkok")
                        .param("district", "District 1")
                        .param("checkIn", invalidCheckIn.toString())
                        .param("checkOut", invalidCheckOut.toString())
                        .param("adults", "2")
                        .param("rooms", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void searchShouldExcludeHotelWhenOneNightIsSoldOut() throws Exception {
        // Contract:
        // Hotel phai available cho tat ca cac dem trong ky o.
        // Chi can sold-out dung mot dem thi hotel do phai bi loai.
        User owner = createOwner("owner-one-night@test.com");

        Hotel availableHotel = createHotel(owner, "Always Available Hotel", "Bangkok", "District 1");
        Room availableRoom = createRoom(availableHotel, "Available Room", 1);
        initInventory(availableRoom);

        Hotel oneNightSoldOutHotel = createHotel(owner, "One Night Sold Out Hotel", "Bangkok", "District 1");
        Room soldOutRoom = createRoom(oneNightSoldOutHotel, "Sold Out Room", 1);
        initInventory(soldOutRoom);
        blockInventoryOnDate(soldOutRoom, checkIn.plusDays(1), 1);

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
                .andExpect(jsonPath("$.data[0].name").value("Always Available Hotel"));
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
        // Tao hotel voi location cu the de test filter location.
        Hotel hotel = new Hotel();
        hotel.setOwner(owner);
        hotel.setName(name);
        hotel.setAddress(name + " address");
        hotel.setProvince(province);
        hotel.setDistrict(district);
        return hotelRepository.save(hotel);
    }

    private Room createRoom(Hotel hotel, String name, int quantity) {
        // Helper mac dinh: room type nay co suc chua 2 nguoi.
        return createRoom(hotel, name, quantity, 2);
    }

    private Room createRoom(Hotel hotel, String name, int quantity, int capacity) {
        // quantity = hotel co bao nhieu phong thuoc room type nay.
        // capacity = moi phong trong room type nay chua duoc bao nhieu nguoi.
        // Test capacity dung helper nay de mo phong hotel du phong nhung thieu suc chua cho adults.
        Room room = new Room();
        room.setHotel(hotel);
        room.setName(name);
        room.setPrice(1_000_000L);
        room.setCapacity(capacity);
        room.setQuantity(quantity);
        return roomRepository.save(room);
    }

    private void initInventory(Room room) {
        // Search chi coi room la available khi moi ngay trong ky o deu co inventory.
        // Helper nay tao inventory cho tat ca cac ngay trong khoang [checkIn, checkOut).
        inventoryService.initInventory(room.getId(), checkIn, checkOut, room.getQuantity());
    }

    private void blockInventoryForEntireStay(Room room, int blockedRooms) {
        // Block cung mot so luong phong tren moi dem cua ky o.
        // blockedRooms = quantity nghia la room van active nhung sold-out trong suot ky o.
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

    private void blockInventoryOnDate(Room room, LocalDate date, int blockedRooms) {
        // Chi block mot dem cu the.
        // Test nay dung de chung minh availability phai dung cho toan bo ky o,
        // chi thieu inventory o mot dem cung phai loai hotel ra.
        DailyInventory inventory = dailyInventoryRepository.findByIdRoomIdAndIdDateBetween(
                room.getId(),
                date,
                date
        ).get(0);

        inventory.setBlockedRooms(blockedRooms);
        dailyInventoryRepository.save(inventory);
    }
}
