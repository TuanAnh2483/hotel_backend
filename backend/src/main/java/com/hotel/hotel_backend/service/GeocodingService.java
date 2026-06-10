package com.hotel.hotel_backend.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Chuyển địa chỉ dạng text thành toạ độ (lat/lng) qua Nominatim (OpenStreetMap).
 * Miễn phí, không cần API key/billing. Toạ độ được lưu vào DB nên mỗi khách sạn chỉ
 * geocode 1 lần.
 *
 * Lưu ý usage policy của Nominatim công cộng:
 *  - Bắt buộc gửi User-Agent định danh ứng dụng.
 *  - Tối đa ~1 request/giây (caller chạy backfill nên tự giãn nhịp).
 */
@Service
@Slf4j
public class GeocodingService {

    private static final String USER_AGENT = "VluHotelHub/1.0 (hotel booking app)";

    private static final ParameterizedTypeReference<List<NominatimResult>> NOMINATIM_LIST =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public GeocodingService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.restClient = RestClient.builder()
                .baseUrl("https://nominatim.openstreetmap.org")
                .defaultHeader("User-Agent", USER_AGENT)
                .requestFactory(factory)
                .build();
    }

    /** Nominatim không cần key → luôn sẵn sàng. */
    public boolean isConfigured() {
        return true;
    }

    /**
     * Geocode từ các thành phần địa chỉ của khách sạn.
     * Ghép address + district + province + ", Việt Nam" để tăng độ chính xác.
     */
    public Optional<GeoPoint> geocode(String address, String district, String province) {
        String query = buildQuery(address, district, province);
        if (query.isBlank()) {
            return Optional.empty();
        }
        return geocode(query);
    }

    public Optional<GeoPoint> geocode(String fullAddress) {
        if (fullAddress == null || fullAddress.isBlank()) {
            return Optional.empty();
        }

        try {
            List<NominatimResult> results = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", fullAddress)
                            .queryParam("format", "json")
                            .queryParam("limit", 1)
                            .queryParam("countrycodes", "vn")
                            .build())
                    .retrieve()
                    .body(NOMINATIM_LIST);

            if (results == null || results.isEmpty()) {
                log.warn("[Geocoding] Không ra kết quả cho '{}'", fullAddress);
                return Optional.empty();
            }

            NominatimResult r = results.get(0);
            return Optional.of(new GeoPoint(
                    Double.parseDouble(r.lat()),
                    Double.parseDouble(r.lon())));
        } catch (Exception e) {
            log.warn("[Geocoding] Lỗi khi geocode '{}': {}", fullAddress, e.getMessage());
            return Optional.empty();
        }
    }

    private String buildQuery(String address, String district, String province) {
        StringBuilder sb = new StringBuilder();
        appendPart(sb, address);
        appendPart(sb, district);
        appendPart(sb, province);
        if (sb.length() > 0) {
            sb.append(", Việt Nam");
        }
        return sb.toString();
    }

    private void appendPart(StringBuilder sb, String part) {
        if (part != null && !part.isBlank()) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(part.trim());
        }
    }

    /** Toạ độ trả về cho caller. */
    public record GeoPoint(double latitude, double longitude) {}

    // ---- Record map từ JSON của Nominatim (chỉ lấy field cần) ----

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NominatimResult(String lat, String lon) {}
}
