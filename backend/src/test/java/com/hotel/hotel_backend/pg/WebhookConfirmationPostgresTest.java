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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the SePay bank-transfer webhook flow against a real PostgreSQL database:
 * PENDING_PAYMENT → webhook received → CONFIRMED.
 * Also verifies idempotency: a duplicate webhook does not create a second transaction.
 */
class WebhookConfirmationPostgresTest extends AbstractPostgresIntegrationTest {

    private static final String WEBHOOK_API_KEY = "Apikey hhb_sepay_webhook_2026";

    private String customerToken;
    private Room room;

    @BeforeEach
    void setUp() {
        clearAll();
        User partner = seedUser("partner-webhook@pg.test", UserType.PARTNER);
        User customer = seedUser("customer-webhook@pg.test", UserType.CUSTOMER);
        customerToken = jwtService.generate(customer);

        var hotel = seedHotel(partner, "Webhook Hotel");
        room = seedRoom(hotel, "Standard Room", 2);
        seedInventoryAndRates(room, 900_000L);
    }

    @Test
    void sepayWebhookConfirmsBookingAndIsIdempotent() throws Exception {
        // 1. Create booking
        MvcResult bookingResult = mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken))
                        .content("""
                                {
                                  "checkIn": "%s",
                                  "checkOut": "%s",
                                  "room": [{ "roomId": %d, "quantity": 1 }],
                                  "contact": {
                                    "fullName": "Webhook Customer",
                                    "email": "customer-webhook@pg.test",
                                    "phone": "0900000002"
                                  }
                                }
                                """.formatted(checkIn, checkOut, room.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andReturn();

        long bookingId = objectMapper.readTree(bookingResult.getResponse().getContentAsString())
                .path("data").path("bookingId").asLong();

        // 2. Create payment session to obtain the unique paymentCode
        MvcResult sessionResult = mockMvc.perform(post("/api/v1/bookings/{id}/payment-session", bookingId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentCode").isString())
                .andReturn();

        JsonNode sessionBody = objectMapper.readTree(sessionResult.getResponse().getContentAsString());
        String paymentCode = sessionBody.path("data").path("paymentCode").asText();
        double amount = sessionBody.path("data").path("amount").asDouble();

        // 3. SePay posts webhook — booking transitions to CONFIRMED
        mockMvc.perform(post("/api/v1/payments/webhooks/sepay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, WEBHOOK_API_KEY)
                        .content("""
                                {
                                  "id": 10001,
                                  "gateway": "MBBank",
                                  "transactionDate": "2026-06-09 10:00:00",
                                  "accountNumber": "0966927203",
                                  "code": "%s",
                                  "content": "%s",
                                  "transferType": "in",
                                  "transferAmount": %s,
                                  "referenceCode": "PG.10001",
                                  "description": "Testcontainers webhook test"
                                }
                                """.formatted(paymentCode, paymentCode, (long) amount)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 4. Verify booking status in PostgreSQL
        mockMvc.perform(get("/api/v1/bookings/{id}", bookingId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.expiresAt").doesNotExist());

        // 5. Idempotency: same webhook again must not create a second payment_transaction row
        mockMvc.perform(post("/api/v1/payments/webhooks/sepay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, WEBHOOK_API_KEY)
                        .content("""
                                {
                                  "id": 10001,
                                  "gateway": "MBBank",
                                  "transactionDate": "2026-06-09 10:00:00",
                                  "accountNumber": "0966927203",
                                  "code": "%s",
                                  "content": "%s",
                                  "transferType": "in",
                                  "transferAmount": %s,
                                  "referenceCode": "PG.10001",
                                  "description": "Duplicate webhook"
                                }
                                """.formatted(paymentCode, paymentCode, (long) amount)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        List<?> transactions = paymentTransactionRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        assertThat(transactions).hasSize(1);
    }
}
