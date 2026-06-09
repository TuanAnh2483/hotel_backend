package com.hotel.hotel_backend.dto.request;

import com.hotel.hotel_backend.entity.BookingStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
public class PartnerBookingSearchRequest {

    @Min(value = 1, message = "hotelId must be >= 1")
    private Long hotelId;

    private BookingStatus status;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkInFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate checkInTo;

    @Min(value = 1, message = "Page must be >= 1")
    private Integer page = 1;

    @Min(value = 1, message = "Size must be >= 1")
    // Calendar occupancy + operations views đọc 1 trang rộng booking của hotel mình
    // (≤100). Thống kê năm đã chuyển sang aggregate server-side nên không cần size 500 nữa.
    @Max(value = 100, message = "Size must be <= 100")
    private Integer size = 10;

    @AssertTrue(message = "checkInTo must be on or after checkInFrom")
    public boolean isCheckInRangeValid() {
        if (checkInFrom == null || checkInTo == null) {
            return true;
        }
        return !checkInTo.isBefore(checkInFrom);
    }
}
