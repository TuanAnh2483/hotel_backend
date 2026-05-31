package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.RefundRequest;
import com.hotel.hotel_backend.entity.RefundRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    Optional<RefundRequest> findByBookingId(Long bookingId);

    long countByStatus(RefundRequestStatus status);

    @Query("""
            select distinct r
            from RefundRequest r
            join fetch r.booking b
            join fetch r.hotel h
            join fetch r.user u
            where u.id = :userId
            order by r.requestedAt desc
            """)
    List<RefundRequest> findCustomerRequests(@Param("userId") Long userId);

    @Query("""
            select distinct r
            from RefundRequest r
            join fetch r.booking b
            join fetch r.hotel h
            join fetch r.user u
            where h.owner.id = :ownerId
              and (:hotelId is null or h.id = :hotelId)
              and (:status is null or r.status = :status)
            order by r.requestedAt desc
            """)
    List<RefundRequest> findPartnerRequests(
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("status") RefundRequestStatus status
    );

    @Query("""
            select distinct r
            from RefundRequest r
            join fetch r.booking b
            join fetch r.hotel h
            join fetch r.user u
            where (:status is null or r.status = :status)
            order by r.requestedAt desc
            """)
    List<RefundRequest> findAdminRequests(@Param("status") RefundRequestStatus status);
}
