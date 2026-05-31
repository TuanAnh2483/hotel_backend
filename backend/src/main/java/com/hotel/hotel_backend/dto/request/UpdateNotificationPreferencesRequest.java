package com.hotel.hotel_backend.dto.request;

public record UpdateNotificationPreferencesRequest(
        Boolean loginAlertEnabled,
        Boolean bookingUpdateEnabled
) {
}
