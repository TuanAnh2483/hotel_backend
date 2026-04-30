package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ImageStorageRouterService {

    private final UploadStorageProperties uploadStorageProperties;
    private final List<ImageStorageProvider> imageStorageProviders;

    @PostConstruct
    void validateConfiguredProvider() {
        // Fail fast ngay lúc boot nếu config provider không match với bean nào đang có.
        resolveActiveProvider();
    }

    public List<String> storeHotelImages(Long hotelId, List<MultipartFile> files) {
        // Từ đây trở xuống controller/service nghiệp vụ không cần biết đang dùng local hay cloud.
        return resolveActiveProvider().storeHotelImages(hotelId, files);
    }

    public List<String> storeRoomImages(Long roomId, List<MultipartFile> files) {
        // Toàn bộ quyết định chọn nơi lưu ảnh được gom tại router này.
        return resolveActiveProvider().storeRoomImages(roomId, files);
    }

    public List<String> storeUserProfileImages(Long userId, List<MultipartFile> files) {
        return resolveActiveProvider().storeUserProfileImages(userId, files);
    }

    /**
     * Delete only when a provider recognizes the stored URL; external URLs are removed from the gallery only.
     */
    public void deleteManagedImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        // Chỉ provider nào "nhận" URL này mới được phép xóa object thật.
        // URL ngoài hệ thống vẫn bị gỡ khỏi DB, nhưng backend không cố xóa trên Internet.
        imageStorageProviders.stream()
                .filter(provider -> provider.manages(imageUrl))
                .findFirst()
                .ifPresent(provider -> provider.deleteImage(imageUrl));
    }

    private ImageStorageProvider resolveActiveProvider() {
        String configuredProvider = normalizeProviderKey(uploadStorageProperties.getProvider());
        // Ví dụ provider=local thì chỉ bean LocalImageStorageService được chọn để upload mới.
        return imageStorageProviders.stream()
                .filter(provider -> provider.providerKey().equals(configuredProvider))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.INTERNAL_ERROR,
                        "Configured upload provider is not available: " + configuredProvider
                ));
    }

    private String normalizeProviderKey(String providerKey) {
        if (providerKey == null || providerKey.isBlank()) {
            return "local";
        }

        // Chuẩn hóa key để config Local / LOCAL / local đều map về cùng một provider.
        return providerKey.trim().toLowerCase();
    }
}
