package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.entity.HotelType;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.service.LocationNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class HotelCandidateQueryService {

    private final HotelRepository hotelRepository;

    public List<Hotel> findCandidates(HotelSearchCriteria criteria) {
        String province = StringUtils.hasText(criteria.province()) ? criteria.province().trim() : null;
        String district = StringUtils.hasText(criteria.district()) ? criteria.district().trim() : null;
        Set<HotelType> hotelTypes = criteria.hotelTypes();

        // Khi có khung nhìn bản đồ ("search as I move the map") thì tìm theo toạ độ,
        // bỏ qua province/district. Database chỉ trả về hotel nằm trong khung nhìn.
        List<Hotel> candidates;
        if (criteria.hasBoundingBox()) {
            candidates = queryByBoundingBox(criteria, hotelTypes);
        } else {
            candidates = queryDatabase(hotelTypes);
            if (province != null) {
                candidates = candidates.stream()
                        .filter(hotel -> LocationNormalizer.provinceMatches(hotel.getProvince(), province))
                        .toList();
            }
            if (district != null) {
                candidates = candidates.stream()
                        .filter(hotel -> LocationNormalizer.districtMatches(hotel.getDistrict(), district))
                        .toList();
            }
        }

        if (!criteria.hotelAmenities().isEmpty()) {
            candidates = candidates.stream()
                    .filter(hotel -> hotel.getAmenities().containsAll(criteria.hotelAmenities()))
                    .toList();
        }

        return candidates;
    }

    private List<Hotel> queryByBoundingBox(HotelSearchCriteria criteria, Set<HotelType> hotelTypes) {
        double swLat = criteria.swLat();
        double neLat = criteria.neLat();
        double swLng = criteria.swLng();
        double neLng = criteria.neLng();

        if (hotelTypes != null && !hotelTypes.isEmpty()) {
            return hotelRepository.findByStatusAndHotelTypeInAndLatitudeBetweenAndLongitudeBetween(
                    HotelStatus.ACTIVE, hotelTypes, swLat, neLat, swLng, neLng);
        }
        return hotelRepository.findByStatusAndLatitudeBetweenAndLongitudeBetween(
                HotelStatus.ACTIVE, swLat, neLat, swLng, neLng);
    }

    private List<Hotel> queryDatabase(Set<HotelType> hotelTypes) {
        boolean hasTypes = hotelTypes != null && !hotelTypes.isEmpty();
        if (hasTypes) {
            return hotelRepository.findByStatusAndHotelTypeIn(HotelStatus.ACTIVE, hotelTypes);
        }
        return hotelRepository.findByStatus(HotelStatus.ACTIVE);
    }
}
