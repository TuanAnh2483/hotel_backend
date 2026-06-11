package com.hotel.hotel_backend.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Serialize mọi {@link LocalDateTime} kèm offset UTC ({@code ...Z}) thay vì chuỗi
 * ISO trần không có timezone.
 *
 * <p><b>Tại sao:</b> toàn bộ app chạy ở UTC (xem {@code HotelBackendApplication}),
 * nên mọi {@code LocalDateTime} đều là giờ UTC. Nếu serialize trần
 * (vd {@code "2026-06-11T12:17:59"}), trình duyệt — qua {@code new Date(str)} —
 * sẽ hiểu nhầm là giờ LOCAL của máy khách (vd UTC+7), khiến mốc thời gian lệch
 * đúng bằng offset của máy. Hệ quả trực tiếp: bộ đếm ngược hạn thanh toán
 * ({@code useCountdown}) tính ra "đã hết hạn" ngay khi vừa tạo booking.
 *
 * <p>Thêm hậu tố {@code Z} để client parse đúng mốc tuyệt đối và tự đổi về giờ địa phương khi hiển thị.
 *
 * <p><b>Lưu ý phiên bản:</b> Spring Boot 4 dùng <b>Jackson 3</b> ({@code tools.jackson.*}),
 * không phải Jackson 2 ({@code com.fasterxml.jackson.*}). Đăng ký qua
 * {@link JsonMapperBuilderCustomizer} để chắc chắn module áp vào đúng {@code JsonMapper}
 * mà Spring MVC dùng.
 */
@Configuration
public class JacksonConfig {

    private static final DateTimeFormatter UTC_ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @Bean
    public JsonMapperBuilderCustomizer localDateTimeAsUtcCustomizer() {
        SimpleModule module = new SimpleModule("LocalDateTimeAsUtc");

        module.addSerializer(LocalDateTime.class, new ValueSerializer<>() {
            @Override
            public void serialize(LocalDateTime value, JsonGenerator gen, SerializationContext ctxt) {
                gen.writeString(value.atOffset(ZoneOffset.UTC).format(UTC_ISO));
            }
        });

        // Nhận cả chuỗi có offset lẫn không offset từ client, luôn quy về giờ UTC.
        module.addDeserializer(LocalDateTime.class, new ValueDeserializer<>() {
            @Override
            public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) {
                String text = p.getValueAsString();
                if (text == null || text.isBlank()) {
                    return null;
                }
                try {
                    return OffsetDateTime.parse(text)
                            .atZoneSameInstant(ZoneOffset.UTC)
                            .toLocalDateTime();
                } catch (Exception ignored) {
                    return LocalDateTime.parse(text);
                }
            }
        });

        return builder -> builder.addModule(module);
    }
}
