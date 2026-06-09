package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageStorageRouterService {

    private final UploadStorageProperties uploadStorageProperties;
    private final List<ImageStorageProvider> imageStorageProviders;

    @PostConstruct
    void validateConfiguredProvider() {
        // Fail fast ngay lúc boot nếu config provider không match với bean nào đang có.
        ImageStorageProvider provider = resolveActiveProvider();
        log.info("Active image upload provider: {}", provider.providerKey());
    }

    public List<String> storeHotelImages(Long hotelId, List<MultipartFile> files) {
        files.forEach(this::assertImageMagicBytes);
        return resolveActiveProvider().storeHotelImages(hotelId, files);
    }

    public List<String> storeRoomImages(Long roomId, List<MultipartFile> files) {
        files.forEach(this::assertImageMagicBytes);
        return resolveActiveProvider().storeRoomImages(roomId, files);
    }

    public List<String> storeUserProfileImages(Long userId, List<MultipartFile> files) {
        files.forEach(this::assertImageMagicBytes);
        return resolveActiveProvider().storeUserProfileImages(userId, files);
    }

    /**
     * Verify the first bytes of the upload match a known image signature so that
     * a malicious client cannot bypass content-type validation by renaming a
     * non-image file and faking the MIME type header.
     */
    private void assertImageMagicBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) return;
        try (InputStream in = file.getInputStream()) {
            byte[] header = in.readNBytes(12);
            if (!isKnownImageSignature(header)) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR,
                        "File content does not match a supported image format (PNG, JPEG, WEBP, GIF)");
            }
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Could not read uploaded file");
        }
    }

    private static boolean isKnownImageSignature(byte[] h) {
        if (h.length < 4) return false;
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && (h[4] & 0xFF) == 0x0D && (h[5] & 0xFF) == 0x0A
                && (h[6] & 0xFF) == 0x1A && (h[7] & 0xFF) == 0x0A) return true;
        // GIF: GIF87a or GIF89a
        if (h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return true;
        // WebP: RIFF????WEBP
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return true;
        return false;
    }

    /**
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
                        unavailableProviderMessage(configuredProvider)
                ));
    }

    private String unavailableProviderMessage(String configuredProvider) {
        if ("cloudinary".equals(configuredProvider) && !uploadStorageProperties.getCloudinary().isEnabled()) {
            return "Cloudinary upload provider is selected but UPLOAD_CLOUDINARY_ENABLED is not true";
        }
        if ("s3".equals(configuredProvider) && !uploadStorageProperties.getS3().isEnabled()) {
            return "S3 upload provider is selected but UPLOAD_S3_ENABLED is not true";
        }
        return "Configured upload provider is not available: " + configuredProvider;
    }

    private String normalizeProviderKey(String providerKey) {
        if (providerKey == null || providerKey.isBlank()) {
            return "local";
        }

        // Chuẩn hóa key để config Local / LOCAL / local đều map về cùng một provider.
        return providerKey.trim().toLowerCase();
    }
}
