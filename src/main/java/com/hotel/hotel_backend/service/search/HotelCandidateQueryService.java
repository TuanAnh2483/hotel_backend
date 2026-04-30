package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.service.LocationNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelCandidateQueryService {

    private final HotelRepository hotelRepository;

    public List<Hotel> findCandidates(HotelSearchCriteria criteria) {
        String requestedProvince = LocationNormalizer.normalizeProvinceKey(criteria.province());
        String requestedDistrict = LocationNormalizer.normalizeDistrictKey(criteria.district());

        if (requestedProvince.isBlank()) {
            return List.of();
        }

        return hotelRepository.findByStatus(HotelStatus.ACTIVE).stream()
                .filter(hotel -> LocationNormalizer.provinceMatches(hotel.getProvince(), requestedProvince))
                .filter(hotel -> requestedDistrict.isBlank()
                        || LocationNormalizer.districtMatches(hotel.getDistrict(), requestedDistrict))
                .filter(hotel -> criteria.hotelTypes().isEmpty() || criteria.hotelTypes().contains(hotel.getHotelType()))
                .filter(hotel -> criteria.hotelAmenities().isEmpty() || hotel.getAmenities().containsAll(criteria.hotelAmenities()))
                .toList();
    }
}
