package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.HotelReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HotelReviewRepository extends JpaRepository<HotelReview, Long> {

    Optional<HotelReview> findByBookingId(Long bookingId);

    Optional<HotelReview> findByIdAndUserId(Long reviewId, Long userId);

    @Query("""
            select distinct r
            from HotelReview r
            join fetch r.hotel h
            join fetch r.booking b
            left join fetch b.contact c
            where h.id = :hotelId
              and (:rating is null or r.rating = :rating)
            order by r.createdAt desc
            """)
    List<HotelReview> findPublicReviews(@Param("hotelId") Long hotelId, @Param("rating") Integer rating);

    @Query("""
            select distinct r
            from HotelReview r
            join fetch r.hotel h
            join fetch r.booking b
            left join fetch b.contact c
            where h.owner.id = :ownerId
              and (:hotelId is null or h.id = :hotelId)
              and (:rating is null or r.rating = :rating)
              and (
                    :hasReply is null
                    or (:hasReply = true and r.partnerReply is not null)
                    or (:hasReply = false and r.partnerReply is null)
              )
            order by r.createdAt desc
            """)
    List<HotelReview> findPartnerReviews(
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("rating") Integer rating,
            @Param("hasReply") Boolean hasReply
    );

    @Query("""
            select distinct r
            from HotelReview r
            join fetch r.hotel h
            join fetch r.booking b
            left join fetch b.contact c
            where r.user.id = :userId
            order by r.createdAt desc
            """)
    List<HotelReview> findCustomerReviews(@Param("userId") Long userId);

    @Query("""
            select r
            from HotelReview r
            join fetch r.hotel h
            join fetch r.booking b
            left join fetch b.contact c
            where r.id = :reviewId
              and h.owner.id = :ownerId
            """)
    Optional<HotelReview> findPartnerOwnedReviewById(
            @Param("ownerId") Long ownerId,
            @Param("reviewId") Long reviewId
    );

    @Query("""
            select avg(r.rating) as averageRating, count(r) as ratingCount
            from HotelReview r
            where r.hotel.id = :hotelId
            """)
    HotelRatingAggregate findHotelRatingAggregate(@Param("hotelId") Long hotelId);

    @Query("""
            select distinct r
            from HotelReview r
            join fetch r.hotel h
            join fetch r.user u
            join fetch r.booking b
            left join fetch b.contact c
            order by r.createdAt desc
            """)
    List<HotelReview> findAllForAdmin();

    interface HotelRatingAggregate {
        Double getAverageRating();

        Long getRatingCount();
    }
}
