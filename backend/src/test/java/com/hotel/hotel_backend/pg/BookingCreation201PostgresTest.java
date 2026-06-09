package com.hotel.hotel_backend.pg;

import com.hotel.hotel_backend.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that POST /api/v1/bookings returns HTTP 201 Created with a Location header
 * and that PostgreSQL inventory rows are correctly blocked after booking.
 */
class BookingCreation201PostgresTest extends AbstractPostgresIntegrationTest {

    private String customerToken;
    private Room room;

    @BeforeEach
    void setUp() {
        clearAll();
        User partner = seedUser("partner-201@pg.test", UserType.PARTNER);
        User customer = seedUser("customer-201@pg.test", UserType.CUSTOMER);
        customerToken = jwtService.generate(customer);

        var hotel = seedHotel(partner, "201 Hotel");
        room = seedRoom(hotel, "Deluxe Room", 2);
        seedInventoryAndRates(room, 800_000L);
    }

    @Test
    void createBookingReturns201WithLocationHeader() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken))
                        .content("""
                                {
                                  "checkIn": "%s",
                                  "checkOut": "%s",
                                  "room": [{ "roomId": %d, "quantity": 1 }],
                                  "contact": {
                                    "fullName": "PG Test Customer",
                                    "email": "customer-201@pg.test",
                                    "phone": "0900000001"
                                  }
                                }
                                """.formatted(checkIn, checkOut, room.getId())))
                .andExpect(status().isCreated())
                .andExpect(header().exists(HttpHeaders.LOCATION))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.totalPrice").value(1_600_000.0))
                .andReturn();

        // Location header must point to the new booking resource
        String location = result.getResponse().getHeader(HttpHeaders.LOCATION);
        assertThat(location).contains("/api/v1/bookings/");

        // Booking ID extracted from response body
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        long bookingId = body.path("data").path("bookingId").asLong();
        assertThat(bookingId).isPositive();
        assertThat(location).endsWith(String.valueOf(bookingId));

        // PostgreSQL inventory rows must show exactly 1 blocked room for each night
        List<DailyInventory> inventories = dailyInventoryRepository
                .findByIdRoomIdAndIdDateBetween(room.getId(), checkIn, checkOut.minusDays(1));
        assertThat(inventories).isNotEmpty();
        assertThat(inventories).allMatch(inv -> inv.getBlockedRooms() == 1);
    }

    @Test
    void getBookingAfterCreationShowsPendingPayment() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken))
                        .content("""
                                {
                                  "checkIn": "%s",
                                  "checkOut": "%s",
                                  "room": [{ "roomId": %d, "quantity": 1 }],
                                  "contact": {
                                    "fullName": "PG Test Customer",
                                    "email": "customer-201@pg.test",
                                    "phone": "0900000001"
                                  }
                                }
                                """.formatted(checkIn, checkOut, room.getId())))
                .andExpect(status().isCreated())
                .andReturn();

        long bookingId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("bookingId").asLong();

        mockMvc.perform(get("/api/v1/bookings/{id}", bookingId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(bookingId))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.expiresAt").exists());
    }
}
