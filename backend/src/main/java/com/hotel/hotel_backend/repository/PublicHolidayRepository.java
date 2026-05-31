package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, Long> {
    Optional<PublicHoliday> findByDate(String date);
    boolean existsByDate(String date);
}
