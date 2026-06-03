package com.hotel.hotel_backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

@Service
@Slf4j
@ConditionalOnProperty(prefix = "app.uploads.cloudinary", name = "enabled", havingValue = "true")
public class CloudinaryImageStorageProvider implements ImageStorageProvider {

    private final UploadStorageProperties uploadStorageProperties;
    private final Cloudinary cloudinary;

    public CloudinaryImageStorageProvider(UploadStorageProperties uploadStorageProperties) {
        this.uploadStorageProperties = uploadStorageProperties;

        UploadStorageProperties.CloudinaryProperties cloudinaryProperties = uploadStorageProperties.getCloudinary();
        if (!StringUtils.hasText(cloudinaryProperties.getCloudName())
                || !StringUtils.hasText(cloudinaryProperties.getApiKey())
                || !StringUtils.hasText(cloudinaryProperties.getApiSecret())) {
            throw new IllegalStateException("Cloudinary upload provider is enabled but credentials are incomplete");
        }

        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudinaryProperties.getCloudName(),
                "api_key", cloudinaryProperties.getApiKey(),
                "api_secret", cloudinaryProperties.getApiSecret(),
                "secure", true
        ));
        // Từ đây provider này tự chịu trách nhiệm upload/delete ảnh trên Cloudinary.
    }

    @Override
    public String providerKey() {
        return "cloudinary";
    }

    @Override
    public List<String> storeHotelImages(Long hotelId, List<MultipartFile> files) {
        return uploadImages("hotels", hotelId, files);
    }

    @Override
    public List<String> storeRoomImages(Long roomId, List<MultipartFile> files) {
        return uploadImages("rooms", roomId, files);
    }

    @Override
    public List<String> storeUserProfileImages(Long userId, List<MultipartFile> files) {
        return uploadImages("profiles", userId, files);
    }

    @Override
    public boolean manages(String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            return false;
        }

        try {
            URI uri = new URI(imageUrl.trim());
            return uri.getHost() != null
                    && uri.getHost().contains("cloudinary.com")
                    && uri.getPath() != null
                    && uri.getPath().contains("/" + uploadStorageProperties.getCloudinary().getCloudName() + "/");
        } catch (URISyntaxException ex) {
            return false;
        }
    }

    @Override
    public void deleteImage(String imageUrl) {
        String publicId = extractPublicId(imageUrl);
        if (publicId == null) {
            return;
        }

        try {
            // Cloudinary xóa theo publicId, không xóa trực tiếp bằng full URL.
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", "image",
                    "invalidate", true
            ));
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to delete Cloudinary image");
        }
    }

    private List<String> uploadImages(String scope, Long ownerId, List<MultipartFile> files) {
        if (ownerId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Owner id is required");
        }
        if (files == null || files.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "At least one image file is required");
        }

        // Validate tất cả trước khi upload để fail-fast
        files.forEach(this::validateImage);

        // Upload song song — 3 ảnh chạy cùng lúc thay vì nối tiếp
        List<CompletableFuture<String>> futures = files.stream()
                .map(file -> CompletableFuture.supplyAsync(() -> uploadSingleImage(scope, ownerId, file)))
                .toList();

        try {
            // Đợi tất cả hoàn thành, giữ đúng thứ tự
            CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();
            List<String> publicUrls = new ArrayList<>(futures.size());
            for (CompletableFuture<String> future : futures) {
                publicUrls.add(future.get());
            }
            return publicUrls;
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause();
            if (cause instanceof ApiException apiEx) throw apiEx;
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to upload images to Cloudinary", cause);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Image upload interrupted");
        }
    }

    private String uploadSingleImage(String scope, Long ownerId, MultipartFile file) {
        String publicId = buildPublicId(scope, ownerId);
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "resource_type", "image",
                            "overwrite", false
                    )
            );
            Object secureUrl = uploadResult.get("secure_url");
            Object fallbackUrl = uploadResult.get("url");
            String publicUrl = secureUrl != null ? secureUrl.toString()
                    : fallbackUrl != null ? fallbackUrl.toString() : null;
            if (!StringUtils.hasText(publicUrl)) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Cloudinary upload returned no public URL");
            }
            return publicUrl;
        } catch (IOException ex) {
            log.error("Failed to read image bytes before Cloudinary upload. scope={}, ownerId={}, fileName={}",
                    scope, ownerId, file.getOriginalFilename(), ex);
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to read image file before Cloudinary upload", ex);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Cloudinary upload failed. scope={}, ownerId={}, fileName={}",
                    scope, ownerId, file.getOriginalFilename(), ex);
            throw new ApiException(ErrorCode.INTERNAL_ERROR,
                    "Failed to upload image to Cloudinary: " + resolveFailureDetail(ex), ex);
        }
    }

    private String resolveFailureDetail(Exception ex) {
        String message = ex.getMessage();
        if (!StringUtils.hasText(message)) {
            return "check Cloudinary cloud name, API credentials, account permissions, and network connectivity";
        }

        // Không trả nhầm secret ra response nếu Cloudinary SDK đưa config vào message lỗi.
        return message.replaceAll("(?i)(api_secret[=:])[^,\\s&]+", "$1***");
    }

    private String buildPublicId(String scope, Long ownerId) {
        // Cloudinary folder được nhóm theo scope + ownerId để dễ quản lý tài nguyên.
        String folderPrefix = normalizeFolderPrefix(uploadStorageProperties.getCloudinary().getFolderPrefix());
        String scopedFolder = scope + "/" + ownerId + "/" + UUID.randomUUID();
        return folderPrefix.isEmpty() ? scopedFolder : folderPrefix + "/" + scopedFolder;
    }

    private String extractPublicId(String imageUrl) {
        if (!manages(imageUrl)) {
            return null;
        }

        try {
            // URL Cloudinary có version segment như /image/upload/v123/... nên cần bóc publicId ra lại.
            URI uri = new URI(imageUrl.trim());
            String path = uri.getPath();
            String marker = "/image/upload/";
            int markerIndex = path.indexOf(marker);
            if (markerIndex < 0) {
                return null;
            }

            String remainder = path.substring(markerIndex + marker.length());
            String[] segments = remainder.split("/");
            int startIndex = segments.length > 0 && segments[0].matches("v\\d+") ? 1 : 0;
            if (segments.length <= startIndex) {
                return null;
            }

            StringBuilder publicId = new StringBuilder();
            for (int index = startIndex; index < segments.length; index++) {
                if (publicId.length() > 0) {
                    publicId.append('/');
                }

                String segment = segments[index];
                if (index == segments.length - 1) {
                    int extensionIndex = segment.lastIndexOf('.');
                    publicId.append(extensionIndex >= 0 ? segment.substring(0, extensionIndex) : segment);
                } else {
                    publicId.append(segment);
                }
            }
            return publicId.toString();
        } catch (URISyntaxException ex) {
            return null;
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Image file must not be empty");
        }
        if (file.getSize() > uploadStorageProperties.getMaxFileSizeBytes()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Image file exceeds maximum allowed size");
        }

        String contentType = file.getContentType();
        if (contentType == null || resolveExtensionOrNull(contentType) == null) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Only PNG, JPEG, WEBP, or GIF images are supported"
            );
        }
    }

    private String resolveExtensionOrNull(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> null;
        };
    }

    private String normalizeFolderPrefix(String folderPrefix) {
        if (!StringUtils.hasText(folderPrefix)) {
            return "";
        }

        String normalized = folderPrefix.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
