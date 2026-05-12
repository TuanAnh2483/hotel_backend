package com.hotel.hotel_backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@RequiredArgsConstructor
public class UploadWebConfig implements WebMvcConfigurer {

    private final UploadStorageProperties uploadStorageProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path storageRoot = resolveStorageRoot();
        String publicBasePath = normalizePublicBasePath(uploadStorageProperties.getPublicBasePath());
        registry.addResourceHandler(publicBasePath + "/**")
                .addResourceLocations(storageRoot.toUri().toString());
    }

    private Path resolveStorageRoot() {
        Path storageRoot = Paths.get(uploadStorageProperties.getStorageRoot())
                .toAbsolutePath()
                .normalize();
        try {
            Files.createDirectories(storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to prepare upload storage directory", ex);
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
}
