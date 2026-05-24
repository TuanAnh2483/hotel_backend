package com.hotel.hotel_backend.dto.request;

import com.hotel.hotel_backend.entity.RoomUnitStatus;
import jakarta.validation.constraints.Size;

public record CreateRoomUnitRequest(
        @Size(max = 20, message = "Số phòng không được vượt quá 20 ký tự")
        String roomNumber,

        Integer floor,

        RoomUnitStatus status,

        @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
        String notes
) {}
