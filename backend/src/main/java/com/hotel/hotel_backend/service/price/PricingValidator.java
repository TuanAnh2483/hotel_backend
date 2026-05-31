package com.hotel.hotel_backend.service.price;




import com.hotel.hotel_backend.entity.PricingModel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
@Component
public class PricingValidator {

    public void validateDateRange(
            LocalDate from,
            LocalDate to
    ) {

        if (from == null || to == null) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Date range cannot be null"
            );
        }

        if (from.isAfter(to)) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "From date must be before to date"
            );
        }

        if (from.isBefore(LocalDate.now().minusDays(1))) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Cannot pricing for past dates"
            );
        }
    }

    public void validateRoom(Room room) {

        if (room == null) {
            throw new ApiException(
                    ErrorCode.NOT_FOUND,
                    "Room not found"
            );
        }

        if (room.getQuantity() <= 0) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Room quantity invalid"
            );
        }

        if (room.getPrice() <= 0) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Room price invalid"
            );
        }
    }

    public void validatePricingModel(PricingModel model) {

        if (model == null) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Pricing model not found"
            );
        }
    }

    public void validateOccupancy(double occupancy) {

        if (occupancy < 0 || occupancy > 1.0) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Invalid occupancy value"
            );
        }
    }
}
