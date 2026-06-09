package com.hotel.hotel_backend.pg;

import com.hotel.hotel_backend.entity.*;
import com.hotel.hotel_backend.repository.PriceFeedbackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the AI pricing feedback pipeline against a real PostgreSQL database:
 * partner records price decisions (feedback), feedback persists in PostgreSQL,
 * and the logistic-regression model can be trained from that stored data.
 */
class AiPricingFeedbackPostgresTest extends AbstractPostgresIntegrationTest {

    @Autowired private PriceFeedbackRepository priceFeedbackRepository;

    private String partnerToken;
    private Room room;

    @BeforeEach
    void setUp() {
        priceFeedbackRepository.deleteAll();
        clearAll();

        User partner = seedUser("partner-ai@pg.test", UserType.PARTNER);
        partnerToken = jwtService.generate(partner);

        var hotel = seedHotel(partner, "AI Hotel");
        room = seedRoom(hotel, "AI Room", 3);
        seedInventoryAndRates(room, 1_200_000L);
    }

    @Test
    void priceFeedbackIsPersistableInPostgres() throws Exception {
        // Record three feedback entries: partner accepted AI price twice, skipped once
        postFeedback(checkIn.toString(), 1_200_000L, 1_200_000L, "APPLIED");
        postFeedback(checkIn.plusDays(1).toString(), 1_250_000L, 1_187_500L, "APPLIED_MINUS5");
        postFeedback(checkIn.plusDays(2).toString(), 1_300_000L, null, "SKIPPED");

        // All 3 rows must be persisted in PostgreSQL
        long count = priceFeedbackRepository.countByRoomIdAndCreatedAtAfter(
                room.getId(), LocalDateTime.now().minusMinutes(1));
        assertThat(count).isEqualTo(3);
    }

    @Test
    void modelTrainingSucceedsWhenFeedbackIsPresent() throws Exception {
        // Seed enough feedback for model training
        for (int i = 0; i < 5; i++) {
            postFeedback(checkIn.plusDays(i).toString(), 1_100_000L + i * 50_000L,
                    1_100_000L + i * 50_000L, "APPLIED");
        }

        // Trigger training — must return a summary without throwing 5xx
        mockMvc.perform(post("/api/v1/partner/rooms/{roomId}/train", room.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(partnerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    private void postFeedback(String date, long suggested, Long applied, String outcome) throws Exception {
        String body = applied != null
                ? """
                  {
                    "date": "%s",
                    "suggested": %d,
                    "appliedPrice": %d,
                    "outcome": "%s"
                  }
                  """.formatted(date, suggested, applied, outcome)
                : """
                  {
                    "date": "%s",
                    "suggested": %d,
                    "outcome": "%s"
                  }
                  """.formatted(date, suggested, outcome);

        mockMvc.perform(post("/api/v1/partner/rooms/{roomId}/price-feedback", room.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(HttpHeaders.AUTHORIZATION, bearer(partnerToken))
                        .content(body))
                .andExpect(status().isOk());
    }
}
