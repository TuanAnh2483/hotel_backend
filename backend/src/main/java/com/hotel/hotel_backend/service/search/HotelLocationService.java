package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.dto.response.HotelLocationOptionResponse;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Collator;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HotelLocationService {

    private final HotelRepository hotelRepository;

    @Cacheable("locationOptions")
    public List<HotelLocationOptionResponse> getActiveLocationOptions() {
        Map<String, Set<String>> districtsByProvince = new LinkedHashMap<>();

        for (Object[] row : hotelRepository.findDistinctLocationsByStatus(HotelStatus.ACTIVE)) {
            String province = clean((String) row[0]);
            if (province.isBlank()) continue;
            String district = clean((String) row[1]);
            districtsByProvince
                    .computeIfAbsent(province, key -> new LinkedHashSet<>())
                    .add(district);
        }

        return districtsByProvince.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(localeComparator()))
                .map(entry -> new HotelLocationOptionResponse(
                        entry.getKey(),
                        entry.getValue().stream()
                                .filter(district -> !district.isBlank())
                                .sorted(localeComparator())
                                .toList()
                ))
                .toList();
    }

    private Comparator<String> localeComparator() {
        Collator collator = Collator.getInstance(new Locale("vi", "VN"));
        return collator::compare;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
