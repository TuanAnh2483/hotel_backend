package com.hotel.hotel_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.admin-seed")
public record AdminSeedProperties(
        boolean enabled,
        String email,
        String password
) {
}
