package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelStatus;
import com.hotel.hotel_backend.entity.HotelType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
 @EntityGraph(attributePaths = {"amenities", "customAmenities", "imageUrls"})
 List<Hotel>  findByOwnerId(Long ownerId );

 long countByOwnerId(Long ownerId);

 boolean existsByOwnerIdAndNameIgnoreCase(Long ownerId, String name);

 boolean existsByOwnerIdAndNameIgnoreCaseAndIdNot(Long ownerId, String name, Long id);

 @EntityGraph(attributePaths = {"owner", "amenities", "customAmenities"})
 List<Hotel> findAllByOrderByCreatedAtDesc();

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByProvinceAndStatus(String province, HotelStatus status);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByProvinceAndDistrictAndStatus(String province, String district, HotelStatus status);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByStatus(HotelStatus status);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByStatusAndHotelTypeIn(HotelStatus status, Collection<HotelType> hotelTypes);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByProvinceAndStatusAndHotelTypeIn(String province, HotelStatus status, Collection<HotelType> hotelTypes);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByProvinceAndDistrictAndStatusAndHotelTypeIn(String province, String district, HotelStatus status, Collection<HotelType> hotelTypes);

 /** Load hotel với đầy đủ collections — dùng cho detail page */
 @EntityGraph(attributePaths = {"amenities", "customAmenities", "imageUrls"})
 @Query("SELECT h FROM Hotel h WHERE h.id = :id")
 java.util.Optional<Hotel> findByIdWithCollections(@Param("id") Long id);

 /** Chỉ lấy 2 cột province + district, không load entity → không trigger EAGER collections */
 @Query("SELECT h.province, h.district FROM Hotel h WHERE h.status = :status")
 List<Object[]> findDistinctLocationsByStatus(@Param("status") HotelStatus status);

 /**
  * Dòng gợi ý khách sạn cho chatbot: id, name, province, district, ratingAvg, ratingCount, giá phòng thấp nhất.
  * Chỉ khách sạn ACTIVE có ít nhất 1 phòng. Lọc địa điểm + sắp xếp xử lý ở tầng service.
  */
 @Query("""
         SELECT h.id, h.name, h.province, h.district, h.ratingAvg, h.ratingCount, MIN(r.price)
         FROM Hotel h JOIN h.rooms r
         WHERE h.status = com.hotel.hotel_backend.entity.HotelStatus.ACTIVE
         GROUP BY h.id, h.name, h.province, h.district, h.ratingAvg, h.ratingCount
         """)
 List<Object[]> findHotelSuggestionRows();

 /** Khách sạn chưa có toạ độ — dùng cho backfill geocoding dữ liệu cũ. */
 List<Hotel> findByLatitudeIsNullOrLongitudeIsNull();

 /** Khách sạn nằm trong khung nhìn bản đồ (bounding box) — dùng cho "search as I move the map". */
 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByStatusAndLatitudeBetweenAndLongitudeBetween(
         HotelStatus status, double swLat, double neLat, double swLng, double neLng);

 @EntityGraph(attributePaths = {"amenities", "imageUrls"})
 List<Hotel> findByStatusAndHotelTypeInAndLatitudeBetweenAndLongitudeBetween(
         HotelStatus status, Collection<HotelType> hotelTypes,
         double swLat, double neLat, double swLng, double neLng);
}
