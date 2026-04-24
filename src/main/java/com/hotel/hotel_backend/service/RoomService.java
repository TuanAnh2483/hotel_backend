package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.CreateRoomRequest;
import com.hotel.hotel_backend.dto.response.RoomResponse;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final HotelRepository hotelRepository;
    private final InventoryService inventoryService;
    private final SecurityService securityService;

    public RoomResponse create(Long hotelId, CreateRoomRequest request) {
        // Tạo phòng mới cho khách sạn thuộc sở hữu hiện tại.
        Hotel hotel = findOwnedHotel(hotelId);

        Room room = new Room();
        room.setName(request.name());
        room.setCapacity(request.capacity());
        room.setQuantity(request.quantity());
        room.setPrice(request.price());
        room.setHotel(hotel);
        room.setRoomCategory(request.roomCategory());
        room.setBedType(request.bedType());
        room.setAmenities(request.amenities() == null ? new HashSet<>() : new HashSet<>(request.amenities()));
        room.setImageUrls(normalizeImageUrls(request.imageUrls()));
        room.setCoverImageUrl(resolveCoverImageUrl(null, room.getImageUrls()));

        roomRepository.save(room);
        inventoryService.generateInventory(room);

        return mapToResponse(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByHotel(Long hotelId) {
        // Lấy danh sách phòng của khách sạn thuộc sở hữu hiện tại.
        Hotel hotel = findOwnedHotel(hotelId);

        return roomRepository.findByHotelId(hotel.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public RoomResponse update(Long roomId, CreateRoomRequest request) {
        // Cập nhật thông tin phòng thuộc sở hữu hiện tại.
        Room room = findOwnedRoom(roomId);

        room.setName(request.name());
        room.setCapacity(request.capacity());
        room.setQuantity(request.quantity());
        room.setPrice(request.price());
        room.setRoomCategory(request.roomCategory());
        room.setBedType(request.bedType());
        room.setAmenities(request.amenities() == null ? new HashSet<>() : new HashSet<>(request.amenities()));
        room.setImageUrls(normalizeImageUrls(request.imageUrls()));
        room.setCoverImageUrl(resolveCoverImageUrl(room.getCoverImageUrl(), room.getImageUrls()));

        return mapToResponse(room);
    }

    @Transactional(readOnly = true)
    public void assertOwnedRoom(Long roomId) {
        findOwnedRoom(roomId);
    }

    public RoomResponse appendImageUrls(Long roomId, List<String> imageUrls) {
        Room room = findOwnedRoom(roomId);
        room.setImageUrls(mergeImageUrls(room.getImageUrls(), imageUrls));
        // Room dùng cùng quy tắc cover như hotel: cover hợp lệ thì giữ, không thì fallback ảnh đầu tiên.
        room.setCoverImageUrl(resolveCoverImageUrl(room.getCoverImageUrl(), room.getImageUrls()));
        return mapToResponse(room);
    }

    @Transactional(readOnly = true)
    public String getOwnedRoomImageUrl(Long roomId, String imageUrl) {
        Room room = findOwnedRoom(roomId);
        String normalized = normalizeRequiredImageUrl(imageUrl);
        if (!copyImageUrls(room.getImageUrls()).contains(normalized)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Room image not found");
        }
        return normalized;
    }

    public RoomResponse removeImageUrl(Long roomId, String imageUrl) {
        Room room = findOwnedRoom(roomId);
        String normalized = normalizeRequiredImageUrl(imageUrl);

        List<String> updatedImageUrls = copyImageUrls(room.getImageUrls()).stream()
                .filter(existingImageUrl -> !existingImageUrl.equals(normalized))
                .toList();

        if (updatedImageUrls.size() == copyImageUrls(room.getImageUrls()).size()) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Room image not found");
        }

        room.setImageUrls(new ArrayList<>(updatedImageUrls));
        // Xóa ảnh cover hiện tại sẽ tự chuyển sang ảnh đầu tiên còn lại hoặc null nếu gallery rỗng.
        room.setCoverImageUrl(resolveCoverImageUrl(room.getCoverImageUrl(), room.getImageUrls()));
        return mapToResponse(room);
    }

    public RoomResponse setCoverImageUrl(Long roomId, String imageUrl) {
        Room room = findOwnedRoom(roomId);
        String normalized = normalizeRequiredImageUrl(imageUrl);
        if (!copyImageUrls(room.getImageUrls()).contains(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Cover image must exist in the room gallery");
        }

        // Chỉ đổi ảnh đại diện; danh sách imageUrls không thay đổi.
        room.setCoverImageUrl(normalized);
        return mapToResponse(room);
    }

    public void delete(Long roomId) {
        // Xóa phòng thuộc sở hữu hiện tại.
        Room room = findOwnedRoom(roomId);
        roomRepository.delete(room);
    }

    // ---------------- Helper methods ----------------

    private Hotel findOwnedHotel(Long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));

        if (!hotel.getOwner().getId().equals(getPrincipal().userId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        return hotel;
    }

    private Room findOwnedRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));

        if (!room.getHotel().getOwner().getId()
                .equals(getPrincipal().userId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        return room;
    }

    private JwtPrincipal getPrincipal() {
        return securityService.getCurrentPrincipal();
    }

    private RoomResponse mapToResponse(Room room) {
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getCapacity(),
                room.getQuantity(),
                room.getPrice(),
                room.getHotel().getId(),
                room.getRoomCategory(),
                room.getBedType(),
                room.getAmenities(),
                resolveCoverImageUrl(room.getCoverImageUrl(), room.getImageUrls()),
                copyImageUrls(room.getImageUrls())
        );
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        // Chỉ giữ lại các URL không trống và duy trì thứ tự do người dùng định nghĩa mà không có bản sao trùng lặp.
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<String> uniqueUrls = new LinkedHashSet<>();
        for (String imageUrl : imageUrls) {
            if (imageUrl == null) {
                continue;
            }

            String normalized = imageUrl.trim();
            if (!normalized.isEmpty()) {
                uniqueUrls.add(normalized);
            }
        }

        return new ArrayList<>(uniqueUrls);
    }

    private List<String> copyImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        return List.copyOf(imageUrls);
    }

    private List<String> mergeImageUrls(List<String> currentImageUrls, List<String> imageUrlsToAppend) {
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        merged.addAll(copyImageUrls(currentImageUrls));
        merged.addAll(normalizeImageUrls(imageUrlsToAppend));
        return new ArrayList<>(merged);
    }

    private String normalizeRequiredImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "imageUrl is required");
        }

        return imageUrl.trim();
    }

    private String resolveCoverImageUrl(String preferredCoverImageUrl, List<String> imageUrls) {
        List<String> normalizedImageUrls = copyImageUrls(imageUrls);
        if (normalizedImageUrls.isEmpty()) {
            return null;
        }

        // Giữ cover hiện tại nếu URL đó vẫn còn trong gallery.
        if (preferredCoverImageUrl != null) {
            String normalizedCover = preferredCoverImageUrl.trim();
            if (!normalizedCover.isEmpty() && normalizedImageUrls.contains(normalizedCover)) {
                return normalizedCover;
            }
        }

        // Nếu không còn cover hợp lệ thì lấy ảnh đầu tiên làm ảnh đại diện mặc định.
        return normalizedImageUrls.get(0);
    }
}
