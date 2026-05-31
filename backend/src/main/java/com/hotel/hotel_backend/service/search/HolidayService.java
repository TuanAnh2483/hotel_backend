package com.hotel.hotel_backend.service.search;


import com.hotel.hotel_backend.entity.PublicHoliday;
import com.hotel.hotel_backend.exception.ApiException;
import com.hotel.hotel_backend.exception.ErrorCode;
import com.hotel.hotel_backend.repository.PublicHolidayRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HolidayService {
    private final PublicHolidayRepository publicHolidayRepository;

    /**
     * trả về {date->tier} map Được lưu vào bộ nhớ đệm cho đến khi các ngày lễ bị biến đổi.
     */
    @Cacheable("holidays")
    public Map<String, String> getHolidayMap() {
        return publicHolidayRepository.findAll().stream()
                .collect(Collectors.toMap(PublicHoliday::getDate, PublicHoliday::getTier));

    }

    public List<PublicHoliday> getAll() {
        return publicHolidayRepository.findAll();
    }

    @CacheEvict(value = "holidays", allEntries = true)
    @Transactional
    public PublicHoliday create(String date, String tier) {
        if (publicHolidayRepository.existsByDate(date)) {
            throw new ApiException(ErrorCode.CONFLICT, "Holiday on" + date + " already exists");
        }
        PublicHoliday holiday = new PublicHoliday();
        holiday.setDate(date);
        holiday.setTier(tier);
        return publicHolidayRepository.save(holiday);
    }

    @CacheEvict(value = "holidays", allEntries = true)
    @Transactional
    public void delete(Long id) {
        if (!publicHolidayRepository.existsById(id)) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Holiday on" + id + " does not exist");
        }
        publicHolidayRepository.deleteById(id);
    }
}



