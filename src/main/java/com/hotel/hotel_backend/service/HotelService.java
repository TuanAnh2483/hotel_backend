package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.CreateHotelRequest;
import com.hotel.hotel_backend.dto.request.UpdateHotelRequest;
import com.hotel.hotel_backend.dto.response.HotelResponse;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.repository.UserRepository;
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
public class HotelService {

    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final SecurityService securityService;

    public HotelResponse create(CreateHotelRequest request) {
        // Tạo khách sạn mới cho partner hiện tại.
        User owner = getCurrentUser();

        Hotel hotel = new Hotel();
        hotel.setName(request.name());
        hotel.setAddress(request.address());
        hotel.setDistrict(request.district());
        hotel.setProvince(request.province());
        hotel.setOwner(owner);
        hotel.setDescription(request.description());
        hotel.setHotelType(request.hotelType());
        hotel.setAmenities(request.amenities() == null ? new HashSet<>() : new HashSet<>(request.amenities()));
        hotel.setImageUrls(normalizeImageUrls(request.imageUrls()));
        hotel.setCoverImageUrl(resolveCoverImageUrl(null, hotel.getImageUrls()));
        hotelRepository.save(hotel);

        return mapToResponse(hotel);
    }

    @Transactional(readOnly = true)
    public List<HotelResponse> getMyHotels() {
        // Lấy danh sách khách sạn của partner hiện tại.
        Long userId = getPrincipal().userId();

        return hotelRepository.findByOwnerId(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public HotelResponse update(Long id, UpdateHotelRequest request) {
        // Cập nhật thông tin khách sạn thuộc sở hữu hiện tại.
        Hotel hotel = findOwnedHotel(id);

        hotel.setName(request.name());
        hotel.setAddress(request.address());
        hotel.setDistrict(request.district());
        hotel.setProvince(request.province());
        hotel.setDescription(request.description());
        hotel.setHotelType(request.hotelType());
        hotel.setAmenities(request.amenities() == null ? new HashSet<>() : new HashSet<>(request.amenities()));
        hotel.setImageUrls(normalizeImageUrls(request.imageUrls()));
        hotel.setCoverImageUrl(resolveCoverImageUrl(hotel.getCoverImageUrl(), hotel.getImageUrls()));

        return mapToResponse(hotel);
    }

    @Transactional(readOnly = true)
    public void assertOwnedHotel(Long id) {
        findOwnedHotel(id);
    }

    public HotelResponse appendImageUrls(Long id, List<String> imageUrls) {
        Hotel hotel = findOwnedHotel(id);
        hotel.setImageUrls(mergeImageUrls(hotel.getImageUrls(), imageUrls));
        // Nếu chưa có cover hợp lệ thì lấy ảnh đầu tiên trong gallery làm cover mặc định.
        hotel.setCoverImageUrl(resolveCoverImageUrl(hotel.getCoverImageUrl(), hotel.getImageUrls()));
        return mapToResponse(hotel);
    }

    @Transactional(readOnly = true)
    public String getOwnedHotelImageUrl(Long id, String imageUrl) {
        Hotel hotel = findOwnedHotel(id);
        String normalized = normalizeRequiredImageUrl(imageUrl);
        if (!copyImageUrls(hotel.getImageUrls()).contains(normalized)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Hotel image not found");
        }
        return normalized;
    }

    public HotelResponse removeImageUrl(Long id, String imageUrl) {
        Hotel hotel = findOwnedHotel(id);
        String normalized = normalizeRequiredImageUrl(imageUrl);

        List<String> updatedImageUrls = copyImageUrls(hotel.getImageUrls()).stream()
                .filter(existingImageUrl -> !existingImageUrl.equals(normalized))
                .toList();

        if (updatedImageUrls.size() == copyImageUrls(hotel.getImageUrls()).size()) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Hotel image not found");
        }

        hotel.setImageUrls(new ArrayList<>(updatedImageUrls));
        // Nếu vừa xóa đúng ảnh cover thì resolveCoverImageUrl sẽ tự fallback sang ảnh đầu tiên còn lại.
        hotel.setCoverImageUrl(resolveCoverImageUrl(hotel.getCoverImageUrl(), hotel.getImageUrls()));
        return mapToResponse(hotel);
    }

    public HotelResponse setCoverImageUrl(Long id, String imageUrl) {
        Hotel hotel = findOwnedHotel(id);
        String normalized = normalizeRequiredImageUrl(imageUrl);
        if (!copyImageUrls(hotel.getImageUrls()).contains(normalized)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Cover image must exist in the hotel gallery");
        }

        // Cover chỉ là một URL tham chiếu đến ảnh đã có, không sinh bản sao dữ liệu mới.
        hotel.setCoverImageUrl(normalized);
        return mapToResponse(hotel);
    }

    @Transactional
    public void delete(Long id) {
        // Xóa khách sạn nếu không có phòng liên kết.
        Hotel hotel = findOwnedHotel(id);

        if (roomRepository.existsByHotelId(id)) {
            throw new ApiException(ErrorCode.HOTEL_HAS_ROOMS);
        }

        hotelRepository.delete(hotel);
    }

    // ---------------- Helper methods ----------------

    private Hotel findOwnedHotel(Long id) {
        Hotel hotel = hotelRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));

        if (!hotel.getOwner().getId().equals(getPrincipal().userId())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        return hotel;
    }

    private JwtPrincipal getPrincipal() {
        return securityService.getCurrentPrincipal();
    }

    private User getCurrentUser() {
        return userRepository.findById(getPrincipal().userId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private HotelResponse mapToResponse(Hotel hotel) {
        return new HotelResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getAddress(),
                hotel.getDistrict(),
                hotel.getProvince(),
                hotel.getDescription(),
                hotel.getHotelType(),
                hotel.getAmenities(),
                resolveCoverImageUrl(hotel.getCoverImageUrl(), hotel.getImageUrls()),
                copyImageUrls(hotel.getImageUrls())
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

        // Nếu cover cũ vẫn còn tồn tại trong gallery thì giữ nguyên.
        if (preferredCoverImageUrl != null) {
            String normalizedCover = preferredCoverImageUrl.trim();
            if (!normalizedCover.isEmpty() && normalizedImageUrls.contains(normalizedCover)) {
                return normalizedCover;
            }
        }

        // Nếu cover cũ bị xóa hoặc chưa từng có thì lấy ảnh đầu tiên làm cover mặc định.
        return normalizedImageUrls.get(0);
    }
}
