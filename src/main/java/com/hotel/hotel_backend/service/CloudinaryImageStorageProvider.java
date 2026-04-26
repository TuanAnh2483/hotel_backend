package com.hotel.hotel_backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
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

@Service
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

        List<String> publicUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            validateImage(file);
            String publicId = buildPublicId(scope, ownerId);

            try {
                // Upload xong lấy secure_url để lưu vào DB.
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
                String publicUrl = secureUrl != null ? secureUrl.toString() : fallbackUrl != null ? fallbackUrl.toString() : null;
                if (!StringUtils.hasText(publicUrl)) {
                    throw new ApiException(ErrorCode.INTERNAL_ERROR, "Cloudinary upload returned no public URL");
                }
                publicUrls.add(publicUrl);
            } catch (IOException ex) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to upload image to Cloudinary");
            } catch (Exception ex) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to upload image to Cloudinary");
            }
        }

        return publicUrls;
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
