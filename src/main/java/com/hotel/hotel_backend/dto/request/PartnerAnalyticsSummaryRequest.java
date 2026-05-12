package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
public class PartnerAnalyticsSummaryRequest {

    @Min(value = 1, message = "hotelId must be >= 1")
    private Long hotelId;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkInFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkInTo;

    @AssertTrue(message = "checkInTo must be on or after checkInFrom")
    public boolean isCheckInRangeValid() {
        if (checkInFrom == null || checkInTo == null) {
            return true;
        }
        return !checkInTo.isBefore(checkInFrom);
    }
}
