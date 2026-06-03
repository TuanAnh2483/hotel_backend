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
        // Province/district từ dropdown frontend = giá trị exact trong DB
        String province = StringUtils.hasText(criteria.province()) ? criteria.province().trim() : null;
        String district = StringUtils.hasText(criteria.district()) ? criteria.district().trim() : null;
        Set<HotelType> hotelTypes = criteria.hotelTypes();

        // Đẩy filter xuống SQL — database chỉ trả về hotel đúng điều kiện
        List<Hotel> candidates = queryDatabase(province, district, hotelTypes);

        // Amenities filter giữ trong Java (cần JOIN + HAVING phức tạp)
        if (!criteria.hotelAmenities().isEmpty()) {
            candidates = candidates.stream()
                    .filter(hotel -> hotel.getAmenities().containsAll(criteria.hotelAmenities()))
                    .toList();
        }

        return candidates;
    }

    private List<Hotel> queryDatabase(String province, String district, Set<HotelType> hotelTypes) {
        boolean hasProvince = province != null;
        boolean hasDistrict = district != null;
        boolean hasTypes = hotelTypes != null && !hotelTypes.isEmpty();

        if (hasProvince && hasDistrict && hasTypes) {
            return hotelRepository.findByProvinceAndDistrictAndStatusAndHotelTypeIn(
                    province, district, HotelStatus.ACTIVE, hotelTypes);
        }
        if (hasProvince && hasDistrict) {
            return hotelRepository.findByProvinceAndDistrictAndStatus(
                    province, district, HotelStatus.ACTIVE);
        }
        if (hasProvince && hasTypes) {
            return hotelRepository.findByProvinceAndStatusAndHotelTypeIn(
                    province, HotelStatus.ACTIVE, hotelTypes);
        }
        if (hasProvince) {
            return hotelRepository.findByProvinceAndStatus(province, HotelStatus.ACTIVE);
        }
        if (hasTypes) {
            return hotelRepository.findByStatusAndHotelTypeIn(HotelStatus.ACTIVE, hotelTypes);
        }
        return hotelRepository.findByStatus(HotelStatus.ACTIVE);
    }
}
