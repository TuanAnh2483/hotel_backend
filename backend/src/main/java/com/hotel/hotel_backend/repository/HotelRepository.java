package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;


import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
 List<Hotel>  findByOwnerId(Long ownerId );

 long countByOwnerId(Long ownerId);

 boolean existsByOwnerIdAndNameIgnoreCase(Long ownerId, String name);

 boolean existsByOwnerIdAndNameIgnoreCaseAndIdNot(Long ownerId, String name, Long id);

 @EntityGraph(attributePaths = {"owner", "amenities", "customAmenities"})
 List<Hotel> findAllByOrderByCreatedAtDesc();

 @EntityGraph(attributePaths = "amenities")
 List<Hotel> findByProvinceAndStatus(String province, HotelStatus status);

 @EntityGraph(attributePaths = "amenities")
 List<Hotel> findByProvinceAndDistrictAndStatus(String province, String district, HotelStatus status);

 List<Hotel> findByStatus(HotelStatus status);
}
