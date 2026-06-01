package com.hotel.hotel_backend.repository;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.entity.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    // FIX BUG-005: SELECT ... FOR UPDATE on the Room row so that concurrent
    // RoomUnit-creation requests cannot both pass the capacity check and both
    // insert — only one proceeds at a time within the transaction.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);
    @EntityGraph(attributePaths = {"amenities", "customAmenities", "imageUrls"})
    List<Room> findByHotelId(Long hotelId);

    List<Room> findByHotelIdAndHotelOwnerId(Long hotelId, Long ownerId);

    Optional<Room> findByIdAndHotelOwnerId(Long roomId, Long ownerId);

    @Query("SELECT r FROM Room r JOIN FETCH r.hotel h WHERE r.id = :roomId AND h.owner.id = :ownerId")
    Optional<Room> findByIdAndHotelOwnerIdWithHotel(@Param("roomId") Long roomId, @Param("ownerId") Long ownerId);

    boolean existsByHotelId(Long hotelId);

    boolean existsByHotelIdAndStatus(Long hotelId, RoomStatus  roomStatus);

    @EntityGraph(attributePaths = {"amenities", "hotel"})
    List<Room> findByHotelIdInAndStatus(List<Long> hotelIds, RoomStatus roomStatus);

}
