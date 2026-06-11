package com.hotel.hotel_backend;

import com.hotel.hotel_backend.config.AdminSeedProperties;
import com.hotel.hotel_backend.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@EnableConfigurationProperties({JwtProperties.class, AdminSeedProperties.class})
@EnableScheduling
@EnableCaching
@EnableAsync
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class HotelBackendApplication {

    public static void main(String[] args) {
        // Ép timezone JVM về UTC ở mọi môi trường (local UTC+7 vs container UTC).
        // Nếu không, LocalDateTime.now() lệch nhau 7 giờ giữa lúc ghi expires_at và
        // lúc so sánh để expire booking → booking PENDING_PAYMENT bị tự hủy ngay khi tạo.
        // Phải set TRƯỚC SpringApplication.run để mọi LocalDateTime.now() đều dùng UTC.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(HotelBackendApplication.class, args);
    }

}
