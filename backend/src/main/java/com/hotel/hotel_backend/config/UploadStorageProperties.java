package com.hotel.hotel_backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.uploads")
public class UploadStorageProperties {

    private String provider = "local";
    private String storageRoot = "./uploads";
    private String publicBasePath = "/uploads";
    private long maxFileSizeBytes = 10 * 1024 * 1024;
    private CloudinaryProperties cloudinary = new CloudinaryProperties();
    private S3Properties s3 = new S3Properties();

    @Getter
    @Setter
    public static class CloudinaryProperties {
        private boolean enabled = false;
        private String cloudName;
        private String apiKey;
        private String apiSecret;
        private String folderPrefix = "hotel-backend";
    }

    @Getter
    @Setter
    public static class S3Properties {
        private boolean enabled = false;
        private String bucket;
        private String region = "ap-southeast-1";
        private String accessKey;
        private String secretKey;
        private String keyPrefix = "hotel-backend";
        private String publicBaseUrl;
    }
}
