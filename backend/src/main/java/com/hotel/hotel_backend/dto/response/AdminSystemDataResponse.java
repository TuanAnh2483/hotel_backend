package com.hotel.hotel_backend.dto.response;

import java.util.List;

public record AdminSystemDataResponse(
        List<AdminSystemFlaggedBookingResponse> flaggedBookings,
        List<AdminSystemRecentErrorResponse> recentErrors
) {
}
