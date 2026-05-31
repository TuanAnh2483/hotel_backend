package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.config.UploadStorageProperties;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "app.uploads.s3", name = "enabled", havingValue = "true")
public class S3ImageStorageProvider implements ImageStorageProvider {

    private final UploadStorageProperties uploadStorageProperties;
    private final S3Client s3Client;

    public S3ImageStorageProvider(UploadStorageProperties uploadStorageProperties) {
        this.uploadStorageProperties = uploadStorageProperties;

        UploadStorageProperties.S3Properties s3Properties = uploadStorageProperties.getS3();
        if (!StringUtils.hasText(s3Properties.getBucket()) || !StringUtils.hasText(s3Properties.getRegion())) {
            throw new IllegalStateException("S3 upload provider is enabled but bucket or region is missing");
        }

        var builder = S3Client.builder()
                .region(Region.of(s3Properties.getRegion()));

        if (StringUtils.hasText(s3Properties.getAccessKey()) && StringUtils.hasText(s3Properties.getSecretKey())) {
            builder.credentialsProvider(
                    StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(s3Properties.getAccessKey(), s3Properties.getSecretKey())
                    )
            );
        } else {
            // Nếu không truyền key trực tiếp, AWS SDK sẽ fallback về chain mặc định của môi trường chạy.
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        this.s3Client = builder.build();
    }

    @Override
    public String providerKey() {
        return "s3";
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

        String publicBaseUrl = normalizePublicBaseUrl(uploadStorageProperties.getS3().getPublicBaseUrl());
        if (StringUtils.hasText(publicBaseUrl)) {
            return imageUrl.trim().startsWith(publicBaseUrl + "/");
        }

        try {
            URI uri = new URI(imageUrl.trim());
            String host = uri.getHost();
            return host != null
                    && host.contains("amazonaws.com")
                    && (host.startsWith(uploadStorageProperties.getS3().getBucket() + ".")
                    || (uri.getPath() != null && uri.getPath().startsWith("/" + uploadStorageProperties.getS3().getBucket() + "/")));
        } catch (URISyntaxException ex) {
            return false;
        }
    }

    @Override
    public void deleteImage(String imageUrl) {
        String objectKey = extractObjectKey(imageUrl);
        if (!StringUtils.hasText(objectKey)) {
            return;
        }

        try {
            // S3 xóa object theo bucket + key.
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(uploadStorageProperties.getS3().getBucket())
                    .key(objectKey)
                    .build());
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to delete S3 image");
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
            String extension = resolveExtension(file.getContentType());
            String objectKey = buildObjectKey(scope, ownerId, extension);

            try {
                // Ghi object lên bucket, contentType đi kèm để browser render đúng loại ảnh.
                s3Client.putObject(
                        PutObjectRequest.builder()
                                .bucket(uploadStorageProperties.getS3().getBucket())
                                .key(objectKey)
                                .contentType(file.getContentType())
                                .build(),
                        RequestBody.fromBytes(file.getBytes())
                );
            } catch (IOException ex) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to read image for S3 upload");
            } catch (Exception ex) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to upload image to S3");
            }

            publicUrls.add(buildPublicUrl(objectKey));
        }

        return publicUrls;
    }

    private String buildObjectKey(String scope, Long ownerId, String extension) {
        // Key S3 được chia folder logic theo scope/ownerId để partner dễ tách tài nguyên.
        String keyPrefix = normalizeKeyPrefix(uploadStorageProperties.getS3().getKeyPrefix());
        String scopedKey = scope + "/" + ownerId + "/" + UUID.randomUUID() + extension;
        return keyPrefix.isEmpty() ? scopedKey : keyPrefix + "/" + scopedKey;
    }

    private String buildPublicUrl(String objectKey) {
        String publicBaseUrl = normalizePublicBaseUrl(uploadStorageProperties.getS3().getPublicBaseUrl());
        if (StringUtils.hasText(publicBaseUrl)) {
            // Nếu có CDN/domain public riêng thì ưu tiên URL này để frontend dùng thống nhất.
            return publicBaseUrl + "/" + objectKey;
        }

        // Nếu chưa có CDN riêng thì dùng URL mặc định do AWS SDK build từ bucket + key.
        return s3Client.utilities()
                .getUrl(GetUrlRequest.builder()
                        .bucket(uploadStorageProperties.getS3().getBucket())
                        .key(objectKey)
                        .build())
                .toExternalForm();
    }

    private String extractObjectKey(String imageUrl) {
        if (!manages(imageUrl)) {
            return null;
        }

        // Khi delete, cần map ngược full URL thành object key thật trong bucket.
        String publicBaseUrl = normalizePublicBaseUrl(uploadStorageProperties.getS3().getPublicBaseUrl());
        if (StringUtils.hasText(publicBaseUrl) && imageUrl.trim().startsWith(publicBaseUrl + "/")) {
            return imageUrl.trim().substring((publicBaseUrl + "/").length());
        }

        try {
            URI uri = new URI(imageUrl.trim());
            String path = uri.getPath();
            if (!StringUtils.hasText(path)) {
                return null;
            }

            String bucket = uploadStorageProperties.getS3().getBucket();
            if (path.startsWith("/" + bucket + "/")) {
                return path.substring(bucket.length() + 2);
            }

            return path.startsWith("/") ? path.substring(1) : path;
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

    private String normalizeKeyPrefix(String keyPrefix) {
        if (!StringUtils.hasText(keyPrefix)) {
            return "";
        }

        String normalized = keyPrefix.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String normalizePublicBaseUrl(String publicBaseUrl) {
        if (!StringUtils.hasText(publicBaseUrl)) {
            return null;
        }

        String normalized = publicBaseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
