package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalImageStorageService implements ImageStorageProvider {

    private final UploadStorageProperties uploadStorageProperties;

    @Override
    public String providerKey() {
        return "local";
    }

    /**
     */
    @Override
    public List<String> storeHotelImages(Long hotelId, List<MultipartFile> files) {
        return storeImages("hotels", hotelId, files);
    }

    /**
     */
    @Override
    public List<String> storeRoomImages(Long roomId, List<MultipartFile> files) {
        return storeImages("rooms", roomId, files);
    }

    @Override
    public List<String> storeUserProfileImages(Long userId, List<MultipartFile> files) {
        return storeImages("profiles", userId, files);
    }

    @Override
    public boolean manages(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return false;
        }

        String publicBasePath = normalizePublicBasePath(uploadStorageProperties.getPublicBasePath());
        return imageUrl.trim().startsWith(publicBasePath + "/");
    }

    @Override
    public void deleteImage(String imageUrl) {
        Path storageRoot = resolveStorageRoot();
        Path targetFile = resolveManagedFilePath(storageRoot, imageUrl);
        if (targetFile == null) {
            return;
        }

        try {
            Files.deleteIfExists(targetFile);
            deleteEmptyParentDirectories(storageRoot, targetFile.getParent());
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to delete image file");
        }
    }

    private List<String> storeImages(String scope, Long ownerId, List<MultipartFile> files) {
        if (ownerId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Owner id is required");
        }
        if (files == null || files.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "At least one image file is required");
        }

        // Cấu trúc local đang là:
        // ./uploads/hotels/{hotelId}/...
        // ./uploads/rooms/{roomId}/...
        Path storageRoot = resolveStorageRoot();
        Path targetDirectory = storageRoot.resolve(scope).resolve(ownerId.toString()).normalize();
        if (!targetDirectory.startsWith(storageRoot)) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Invalid upload target");
        }

        try {
            Files.createDirectories(targetDirectory);
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to prepare upload directory");
        }

        List<String> publicUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            // Validate MIME type và file size trước khi ghi xuống ổ đĩa.
            validateImage(file);
            String extension = resolveExtension(file.getContentType());
            String fileName = UUID.randomUUID() + extension;
            Path targetFile = targetDirectory.resolve(fileName).normalize();
            if (!targetFile.startsWith(targetDirectory)) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Invalid upload target");
            }

            try {
                // transferTo ghi file binary thật xuống local filesystem.
                file.transferTo(targetFile);
            } catch (IOException ex) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to store image file");
            }

            // DB chỉ nhận public URL kiểu /uploads/... để frontend truy cập trực tiếp.
            publicUrls.add(buildPublicUrl(scope, ownerId, fileName));
        }

        return publicUrls;
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

    private String resolveExtension(String contentType) {
        String extension = resolveExtensionOrNull(contentType);
        if (extension == null) {
            throw new ApiException(
                    ErrorCode.VALIDATION_ERROR,
                    "Only PNG, JPEG, WEBP, or GIF images are supported"
            );
        }
        return extension;
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

    private String buildPublicUrl(String scope, Long ownerId, String fileName) {
        return normalizePublicBasePath(uploadStorageProperties.getPublicBasePath())
                + "/" + scope + "/" + ownerId + "/" + fileName;
    }

    private Path resolveStorageRoot() {
        Path storageRoot = Paths.get(uploadStorageProperties.getStorageRoot())
                .toAbsolutePath()
                .normalize();
        try {
            Files.createDirectories(storageRoot);
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to prepare upload storage");
        }
        return storageRoot;
    }

    private String normalizePublicBasePath(String publicBasePath) {
        if (publicBasePath == null || publicBasePath.isBlank()) {
            return "/uploads";
        }

        String normalized = publicBasePath.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }

        while (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private Path resolveManagedFilePath(Path storageRoot, String imageUrl) {
        if (!manages(imageUrl)) {
            return null;
        }

        // URL public /uploads/... được map ngược lại thành path vật lý trong storage-root.
        String publicBasePath = normalizePublicBasePath(uploadStorageProperties.getPublicBasePath());
        String relativePath = extractPath(imageUrl).substring(publicBasePath.length());
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }

        Path resolved = storageRoot.resolve(relativePath).normalize();
        if (!resolved.startsWith(storageRoot)) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Invalid image path");
        }
        return resolved;
    }

    private String extractPath(String imageUrl) {
        try {
            URI uri = new URI(imageUrl.trim());
            return uri.getPath() == null ? imageUrl.trim() : uri.getPath();
        } catch (URISyntaxException ex) {
            return imageUrl.trim();
        }
    }

    private void deleteEmptyParentDirectories(Path storageRoot, Path directory) throws IOException {
        Path current = directory;
        while (current != null && !current.equals(storageRoot)) {
            if (!current.startsWith(storageRoot)) {
                return;
            }

            // Sau khi xóa ảnh, dọn tiếp các folder cha rỗng để thư mục upload không bị phình dần.
            try (var children = Files.list(current)) {
                if (children.findAny().isPresent()) {
                    return;
                }
            }

            Files.deleteIfExists(current);
            current = current.getParent();
        }
    }
}
