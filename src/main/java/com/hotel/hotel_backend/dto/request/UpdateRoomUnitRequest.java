package com.hotel.hotel_backend.dto.request;

import com.hotel.hotel_backend.entity.RoomUnitStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateRoomUnitRequest(
        @Size(max = 20, message = "Số phòng không được vượt quá 20 ký tự")
        String roomNumber,

        Integer floor,

        @NotNull(message = "Trạng thái phòng là bắt buộc")
        RoomUnitStatus status,

        @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
        String notes,

        @Size(max = 200, message = "Tên khách không được vượt quá 200 ký tự")
        String guestName,

        @Size(max = 1000)
        String coverImageUrl
) {}
