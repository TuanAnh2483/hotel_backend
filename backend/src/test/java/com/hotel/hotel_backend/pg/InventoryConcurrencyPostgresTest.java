package com.hotel.hotel_backend.pg;

import com.hotel.hotel_backend.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Verifies that PostgreSQL's optimistic locking (@Version on DailyInventory) prevents
 * double-booking when two requests race for the last available room.
 *
 * Tagged "concurrency" — excluded from the default CI run by Surefire config but
 * runnable locally with: mvn test -Dtest.tags.exclude=""
 */
@Tag("concurrency")
class InventoryConcurrencyPostgresTest extends AbstractPostgresIntegrationTest {

    private Room room;
    private String customerToken1;
    private String customerToken2;

    @BeforeEach
    void setUp() {
        clearAll();
        User partner = seedUser("partner-conc@pg.test", UserType.PARTNER);
        User customer1 = seedUser("customer-conc-1@pg.test", UserType.CUSTOMER);
        User customer2 = seedUser("customer-conc-2@pg.test", UserType.CUSTOMER);
        customerToken1 = jwtService.generate(customer1);
        customerToken2 = jwtService.generate(customer2);

        var hotel = seedHotel(partner, "Concurrency Hotel");
        // quantity=1 means only ONE booking can succeed
        room = seedRoom(hotel, "Last Room", 1);
        seedInventoryAndRates(room, 1_000_000L);
    }

    @Test
    void onlyOneOfTwoConcurrentBookingsShouldSucceed() throws Exception {
        CountDownLatch startGate = new CountDownLatch(1);
        List<Integer> statuses = new ArrayList<>();

        String bookingBody1 = buildBookingJson(room.getId(), "customer-conc-1@pg.test");
        String bookingBody2 = buildBookingJson(room.getId(), "customer-conc-2@pg.test");

        ExecutorService pool = Executors.newFixedThreadPool(2);

        CompletableFuture<Integer> f1 = CompletableFuture.supplyAsync(() -> {
            try {
                startGate.await(5, TimeUnit.SECONDS);
                MockHttpServletResponse res = mockMvc.perform(
                        post("/api/v1/bookings")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(HttpHeaders.AUTHORIZATION, bearer(customerToken1))
                                .content(bookingBody1)
                ).andReturn().getResponse();
                return res.getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, pool);

        CompletableFuture<Integer> f2 = CompletableFuture.supplyAsync(() -> {
            try {
                startGate.await(5, TimeUnit.SECONDS);
                MockHttpServletResponse res = mockMvc.perform(
                        post("/api/v1/bookings")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(HttpHeaders.AUTHORIZATION, bearer(customerToken2))
                                .content(bookingBody2)
                ).andReturn().getResponse();
                return res.getStatus();
            } catch (Exception e) {
                return 500;
            }
        }, pool);

        startGate.countDown(); // release both threads simultaneously
        statuses.add(f1.get(10, TimeUnit.SECONDS));
        statuses.add(f2.get(10, TimeUnit.SECONDS));
        pool.shutdown();

        // Exactly one request must succeed (201) and the other must fail (409 CONFLICT)
        long successCount = statuses.stream().filter(s -> s == 201).count();
        long conflictCount = statuses.stream().filter(s -> s == 409).count();

        assertThat(successCount).as("exactly one booking should succeed").isEqualTo(1);
        assertThat(conflictCount).as("exactly one booking should be rejected").isEqualTo(1);

        // Only one booking persisted in PostgreSQL
        assertThat(bookingRepository.count()).isEqualTo(1);
    }

    private String buildBookingJson(long roomId, String email) {
        return """
                {
                  "checkIn": "%s",
                  "checkOut": "%s",
                  "room": [{ "roomId": %d, "quantity": 1 }],
                  "contact": {
                    "fullName": "Concurrent Customer",
                    "email": "%s",
                    "phone": "0900000009"
                  }
                }
                """.formatted(checkIn, checkOut, roomId, email);
    }
}
