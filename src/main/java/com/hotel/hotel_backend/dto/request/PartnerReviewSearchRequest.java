package com.hotel.hotel_backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PartnerReviewSearchRequest {

    @Min(value = 1, message = "hotelId must be >= 1")
    private Long hotelId;

    @Min(value = 1, message = "rating must be between 1 and 5")
    @Max(value = 5, message = "rating must be between 1 and 5")
    private Integer rating;

    private Boolean hasReply;
}
