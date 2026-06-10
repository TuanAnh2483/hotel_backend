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

        List<Hotel> candidates = queryDatabase(hotelTypes);

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

        if (!criteria.hotelAmenities().isEmpty()) {
            candidates = candidates.stream()
                    .filter(hotel -> hotel.getAmenities().containsAll(criteria.hotelAmenities()))
                    .toList();
        }

        return candidates;
    }

    private List<Hotel> queryDatabase(Set<HotelType> hotelTypes) {
        boolean hasTypes = hotelTypes != null && !hotelTypes.isEmpty();
        if (hasTypes) {
            return hotelRepository.findByStatusAndHotelTypeIn(HotelStatus.ACTIVE, hotelTypes);
        }
        return hotelRepository.findByStatus(HotelStatus.ACTIVE);
    }
}
