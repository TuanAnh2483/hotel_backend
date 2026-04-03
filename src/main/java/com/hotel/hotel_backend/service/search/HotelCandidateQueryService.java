package com.hotel.hotel_backend.service.search;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.repository.HotelRepository;
import jakarta.validation.constraints.AssertTrue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelCandidateQueryService {

    private final HotelRepository hotelRepository;




    public List<Hotel> findCandidates(HotelSearchCriteria criteria) {
        if (criteria.district() != null && !criteria.district().isBlank()) {
            return hotelRepository.findByProvinceAndDistrictAndStatus(
                    criteria.province(),
                    criteria.district(),
                    HotelStatus.ACTIVE
            );
        }





        return hotelRepository.findByProvinceAndStatus(
                criteria.province(),
                HotelStatus.ACTIVE
        );
    }
}
