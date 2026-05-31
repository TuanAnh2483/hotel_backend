package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.entity.BedType;
import com.hotel.hotel_backend.entity.CancellationPolicy;
import com.hotel.hotel_backend.entity.DailyRate;
import com.hotel.hotel_backend.entity.DailyRateId;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelType;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.entity.RoomCategory;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.repository.BookingItemRepository;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import com.hotel.hotel_backend.repository.DailyRateRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.HotelReviewRepository;
import com.hotel.hotel_backend.repository.PaymentTransactionRepository;
import com.hotel.hotel_backend.repository.RefundRequestRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.repository.RoomUnitRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import com.hotel.hotel_backend.security.JwtService;
import com.hotel.hotel_backend.service.InventoryService;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CancellationPolicyIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtService jwtService;

    @Autowired private UserRepository userRepository;
    @Autowired private HotelRepository hotelRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomUnitRepository roomUnitRepository;
    @Autowired private DailyInventoryRepository dailyInventoryRepository;
    @Autowired private DailyRateRepository dailyRateRepository;
    @Autowired private BookingItemRepository bookingItemRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private PaymentTransactionRepository paymentTransactionRepository;
    @Autowired private RefundRequestRepository refundRequestRepository;
    @Autowired private HotelReviewRepository hotelReviewRepository;
    @Autowired private InventoryService inventoryService;

    private LocalDate checkIn;
    private LocalDate checkOut;

    @BeforeEach
    void setUp() {
        checkIn  = LocalDate.now().plusDays(1);
        checkOut = checkIn.plusDays(2);

        hotelReviewRepository.deleteAll();
        refundRequestRepository.deleteAll();
        bookingItemRepository.deleteAll();
        bookingRepository.deleteAll();
        paymentTransactionRepository.deleteAll();
        dailyRateRepository.deleteAll();
        dailyInventoryRepository.deleteAll();
        roomUnitRepository.deleteAll();
        roomRepository.deleteAll();
        hotelRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ── 1. Tạo hotel với FLEXIBLE → response trả về đúng policy ─────────────

    @Test
    void createHotel_withFlexiblePolicy_shouldPersistAndReturnPolicy() throws Exception {
        // Contract: Partner tạo hotel với cancellationPolicy=FLEXIBLE,
        // API phải trả về đúng giá trị trong response.
        String token = partnerToken("partner-flexible@test.com");

        mockMvc.perform(post("/api/partner/hotels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Flexible Hotel",
                                  "address": "123 Beach Road",
                                  "district": "District 1",
                                  "province": "Da Nang",
                                  "hotelType": "HOTEL",
                                  "cancellationPolicy": "FLEXIBLE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("FLEXIBLE"));
    }

    // ── 2. Tạo hotel với STRICT → response trả về đúng policy ───────────────

    @Test
    void createHotel_withStrictPolicy_shouldPersistAndReturnPolicy() throws Exception {
        // Contract: Partner tạo hotel với cancellationPolicy=STRICT,
        // API phải trả về STRICT — không bị override về MODERATE.
        String token = partnerToken("partner-strict@test.com");

        mockMvc.perform(post("/api/partner/hotels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Strict Hotel",
                                  "address": "456 Mountain Rd",
                                  "district": "District 2",
                                  "province": "Ha Noi",
                                  "hotelType": "HOTEL",
                                  "cancellationPolicy": "STRICT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));
    }

    // ── 3. Tạo hotel không gửi policy → default là MODERATE ─────────────────

    @Test
    void createHotel_withoutPolicy_shouldDefaultToModerate() throws Exception {
        // Contract: Khi partner không gửi cancellationPolicy,
        // backend phải gán default MODERATE.
        String token = partnerToken("partner-default@test.com");

        mockMvc.perform(post("/api/partner/hotels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Default Policy Hotel",
                                  "address": "789 Default Ave",
                                  "district": "District 3",
                                  "province": "Ho Chi Minh",
                                  "hotelType": "HOMESTAY"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("MODERATE"));
    }

    // ── 4. GET /api/hotels/{id} trả về cancellationPolicy ────────────────────

    @Test
    void getHotelDetail_shouldReturnCancellationPolicy() throws Exception {
        // Contract: Endpoint public GET /api/hotels/{id} phải include cancellationPolicy
        // để frontend hiển thị đúng badge cho khách hàng.
        User owner = createPartner("owner-detail-policy@test.com");
        Hotel hotel = new Hotel();
        hotel.setOwner(owner);
        hotel.setName("Policy Detail Hotel");
        hotel.setAddress("Detail Address");
        hotel.setProvince("Hue");
        hotel.setDistrict("Hue City");
        hotel.setCancellationPolicy(CancellationPolicy.STRICT);
        hotel = hotelRepository.save(hotel);

        mockMvc.perform(get("/api/hotels/{id}", hotel.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));
    }

    // ── 5. Partner update policy FLEXIBLE → STRICT ──────────────────────────

    @Test
    void updateHotel_shouldChangeCancellationPolicy() throws Exception {
        // Contract: PUT /api/partner/hotels/{id} với cancellationPolicy mới
        // phải update DB, các booking mới sau đó sẽ hiển thị policy mới.
        String token = partnerToken("partner-update-policy@test.com");

        MvcResult createResult = mockMvc.perform(post("/api/partner/hotels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Update Policy Hotel",
                                  "address": "Update St",
                                  "district": "District 4",
                                  "province": "Can Tho",
                                  "hotelType": "HOTEL",
                                  "cancellationPolicy": "FLEXIBLE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("FLEXIBLE"))
                .andReturn();

        long hotelId = readLong(createResult, "data", "id");

        mockMvc.perform(put("/api/partner/hotels/{id}", hotelId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Update Policy Hotel",
                                  "address": "Update St",
                                  "district": "District 4",
                                  "province": "Can Tho",
                                  "hotelType": "HOTEL",
                                  "cancellationPolicy": "STRICT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));

        // Verify: GET lại hotel detail phải trả về STRICT
        mockMvc.perform(get("/api/hotels/{id}", hotelId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));
    }

    // ── 6. Update hotel không gửi policy → giữ nguyên giá trị cũ ────────────

    @Test
    void updateHotel_withoutPolicy_shouldKeepExistingPolicy() throws Exception {
        // Contract: PUT không gửi cancellationPolicy (null) không được reset về MODERATE.
        // Backend phải giữ nguyên giá trị đang lưu trong DB.
        String token = partnerToken("partner-keep-policy@test.com");

        MvcResult createResult = mockMvc.perform(post("/api/partner/hotels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Keep Policy Hotel",
                                  "address": "Keep St",
                                  "district": "District 5",
                                  "province": "Vung Tau",
                                  "hotelType": "RESORT",
                                  "cancellationPolicy": "STRICT"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        long hotelId = readLong(createResult, "data", "id");

        // Update không gửi cancellationPolicy
        mockMvc.perform(put("/api/partner/hotels/{id}", hotelId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "name": "Keep Policy Hotel Updated",
                                  "address": "Keep St",
                                  "district": "District 5",
                                  "province": "Vung Tau",
                                  "hotelType": "RESORT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));
    }

    // ── 7. Booking response phải chứa cancellationPolicy của hotel ───────────

    @Test
    void booking_shouldIncludeCancellationPolicyFromHotel() throws Exception {
        // Contract: POST /api/bookings response phải trả về cancellationPolicy của hotel
        // để frontend BookingDetailPage hiển thị/ẩn nút hoàn tiền đúng.
        User owner   = createCustomer("owner-booking-policy@test.com", UserType.PARTNER);
        String token = customerToken("customer-booking-policy@test.com");

        Hotel hotel = buildHotel(owner, "Policy Booking Hotel", CancellationPolicy.FLEXIBLE);
        Room  room  = buildRoom(hotel);
        inventoryService.initInventory(room.getId(), checkIn, checkOut, room.getQuantity());
        saveDailyRate(room, checkIn,               800_000L);
        saveDailyRate(room, checkIn.plusDays(1),   800_000L);

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "checkIn": "%s",
                                  "checkOut": "%s",
                                  "room": [{ "roomId": %d, "quantity": 1 }],
                                  "contact": {
                                    "fullName": "Test Customer",
                                    "email": "customer-booking-policy@test.com",
                                    "phone": "0900000001"
                                  }
                                }
                                """.formatted(checkIn, checkOut, room.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("FLEXIBLE"));
    }

    // ── 8. Hotel STRICT → booking response trả về STRICT ────────────────────

    @Test
    void booking_strictHotel_shouldReturnStrictPolicy() throws Exception {
        // Contract: Booking tại hotel STRICT phải có cancellationPolicy=STRICT trong response,
        // để frontend biết ẩn nút hoàn tiền cho khách.
        User owner   = createCustomer("owner-strict-booking@test.com", UserType.PARTNER);
        String token = customerToken("customer-strict-booking@test.com");

        Hotel hotel = buildHotel(owner, "Strict Booking Hotel", CancellationPolicy.STRICT);
        Room  room  = buildRoom(hotel);
        inventoryService.initInventory(room.getId(), checkIn, checkOut, room.getQuantity());
        saveDailyRate(room, checkIn,               900_000L);
        saveDailyRate(room, checkIn.plusDays(1),   900_000L);

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .content("""
                                {
                                  "checkIn": "%s",
                                  "checkOut": "%s",
                                  "room": [{ "roomId": %d, "quantity": 1 }],
                                  "contact": {
                                    "fullName": "Strict Customer",
                                    "email": "customer-strict-booking@test.com",
                                    "phone": "0900000002"
                                  }
                                }
                                """.formatted(checkIn, checkOut, room.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancellationPolicy").value("STRICT"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String partnerToken(String email) {
        return jwtService.generate(createPartner(email));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private User createPartner(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("hash-test");
        user.setUserType(UserType.PARTNER);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private long readLong(MvcResult result, String parent, String field) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.path(parent).path(field).asLong();
    }

    private String customerToken(String email) {
        return jwtService.generate(createCustomer(email, UserType.CUSTOMER));
    }

    private User createCustomer(String email, UserType type) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("hash-test");
        user.setUserType(type);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Hotel buildHotel(User owner, String name, CancellationPolicy policy) {
        Hotel hotel = new Hotel();
        hotel.setOwner(owner);
        hotel.setName(name);
        hotel.setAddress(name + " address");
        hotel.setProvince("Ho Chi Minh");
        hotel.setDistrict("District 1");
        hotel.setHotelType(HotelType.HOTEL);
        hotel.setCancellationPolicy(policy);
        return hotelRepository.save(hotel);
    }

    private Room buildRoom(Hotel hotel) {
        Room room = new Room();
        room.setHotel(hotel);
        room.setName("Standard Room");
        room.setPrice(800_000L);
        room.setCapacity(2);
        room.setQuantity(2);
        room.setRoomCategory(RoomCategory.STANDARD);
        room.setBedType(BedType.DOUBLE);
        return roomRepository.save(room);
    }

    private void saveDailyRate(Room room, LocalDate date, long price) {
        DailyRate rate = new DailyRate();
        rate.setId(new DailyRateId(room.getId(), date));
        rate.setRoom(room);
        rate.setPrice(price);
        rate.setMinStay(1);
        rate.setClosed(false);
        dailyRateRepository.save(rate);
    }
}
