package com.hotel.hotel_backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PartnerApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, Long> {

    List<PartnerApplication> findByUserIdOrderByIdDesc(Long userId);

    boolean existsByUserIdAndStatusIn(Long userId, Collection<PartnerApplicationStatus> statuses);

    Optional<PartnerApplication> findByIdAndUserId(Long id, Long userId);

    Optional<PartnerApplication> findTopByUserIdOrderByIdDesc(Long userId);

    List<PartnerApplication> findByStatus(PartnerApplicationStatus status);
}

