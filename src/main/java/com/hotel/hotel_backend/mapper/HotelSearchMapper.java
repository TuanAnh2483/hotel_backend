package com.hotel.hotel_backend.mapper;

import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class HotelSearchMapper {

    public HotelSearchItemResponse toItem(Hotel hotel, Long minPrice) {
        return new HotelSearchItemResponse(
                hotel.getId(),
                hotel.getName(),
                hotel.getAddress(),
                hotel.getProvince(),
                hotel.getDistrict(),
                resolveCoverImageUrl(hotel.getCoverImageUrl(), hotel.getImageUrls()),
                copyImageUrls(hotel.getImageUrls()),
                hotel.getRatingAvg(),
                hotel.getRatingCount(),
                minPrice
        );
    }

    private List<String> copyImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        return List.copyOf(imageUrls);
    }

    private String resolveCoverImageUrl(String preferredCoverImageUrl, List<String> imageUrls) {
        List<String> normalizedImageUrls = copyImageUrls(imageUrls);
        if (preferredCoverImageUrl != null) {
            String normalizedCover = preferredCoverImageUrl.trim();
            if (!normalizedCover.isEmpty() && normalizedImageUrls.contains(normalizedCover)) {
                return normalizedCover;
            }
        }

        return normalizedImageUrls.isEmpty() ? null : normalizedImageUrls.get(0);
    }
}
