package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.response.HotelResponse;
import com.hotel.hotel_backend.dto.response.RoomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PartnerImageUploadService {

    private final HotelService hotelService;
    private final RoomService roomService;
    private final ImageStorageRouterService imageStorageRouterService;

    /**
     * Upload ảnh cho gallery khách sạn của partner.
     */
    public HotelResponse uploadHotelImages(Long hotelId, List<MultipartFile> files) {
        // B1: xác nhận hotel thuộc partner hiện tại.
        hotelService.assertOwnedHotel(hotelId);
        // B2: đẩy file sang provider đang active (local / cloudinary / s3).
        List<String> publicUrls = imageStorageRouterService.storeHotelImages(hotelId, files);
        // B3: chỉ lưu public URL vào DB, không lưu binary trong database.
        return hotelService.appendImageUrls(hotelId, publicUrls);
    }

    /**
     * Upload ảnh cho gallery phòng của partner.
     */
    public RoomResponse uploadRoomImages(Long roomId, List<MultipartFile> files) {
        // B1: xác nhận room thuộc partner hiện tại.
        roomService.assertOwnedRoom(roomId);
        // B2: provider active chịu trách nhiệm lưu file thật và trả public URL.
        List<String> publicUrls = imageStorageRouterService.storeRoomImages(roomId, files);
        // B3: append URL vào gallery và tự tính cover nếu cần.
        return roomService.appendImageUrls(roomId, publicUrls);
    }

    /**
     * Xóa một ảnh khỏi gallery khách sạn và xóa file thật nếu do backend quản lý.
     */
    public HotelResponse deleteHotelImage(Long hotelId, String imageUrl) {
        // Luôn kiểm tra URL này thực sự đang thuộc gallery của hotel.
        String managedImageUrl = hotelService.getOwnedHotelImageUrl(hotelId, imageUrl);
        // Nếu URL này là ảnh do backend quản lý thì xóa file/object thật.
        imageStorageRouterService.deleteManagedImage(managedImageUrl);
        // Sau đó mới gỡ URL khỏi DB và fallback cover nếu cần.
        return hotelService.removeImageUrl(hotelId, managedImageUrl);
    }

    /**
     * Xóa một ảnh khỏi gallery phòng và xóa file thật nếu do backend quản lý.
     */
    public RoomResponse deleteRoomImage(Long roomId, String imageUrl) {
        // Luồng của room giống hotel: kiểm tra sở hữu -> xóa file thật -> cập nhật DB.
        String managedImageUrl = roomService.getOwnedRoomImageUrl(roomId, imageUrl);
        imageStorageRouterService.deleteManagedImage(managedImageUrl);
        return roomService.removeImageUrl(roomId, managedImageUrl);
    }

    public HotelResponse setHotelCoverImage(Long hotelId, String imageUrl) {
        // Chỉ cho phép set cover bằng một URL đã tồn tại trong gallery hiện tại.
        return hotelService.setCoverImageUrl(hotelId, imageUrl);
    }

    public RoomResponse setRoomCoverImage(Long roomId, String imageUrl) {
        // Không tạo file mới; chỉ đổi con trỏ cover sang một ảnh đã có sẵn.
        return roomService.setCoverImageUrl(roomId, imageUrl);
    }
}
