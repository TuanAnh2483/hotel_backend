package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.dto.response.PartnerBookingSummaryResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * "Đơn của tôi" (customer): fetch-join contact + items → room → hotel trong 1 query
     * để tránh N+1 khi BookingMapper.toBookingResponse map từng booking.
     * Chỉ fetch 1 bag collection (items) nên không dính MultipleBagFetchException.
     */
    @Query("""
            select distinct b
            from Booking b
            left join fetch b.contact c
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            where b.userId = :userId
            order by b.createdAt desc
            """)
    List<Booking> findByUserIdWithDetails(@Param("userId") Long userId);

    long countByUserId(Long userId);

    Optional<Booking> findByIdAndUserId(Long id, Long userId);

    /** Dùng để replay idempotent booking — scoped by userId để không leak booking của user khác */
    Optional<Booking> findByIdempotencyKeyAndUserId(String idempotencyKey, Long userId);

    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime expiresAt);

    long countByStatus(BookingStatus status);

    @Query("""
            select distinct b
            from Booking b
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            where b.userId = :userId
              and b.status = com.hotel.hotel_backend.entity.BookingStatus.COMPLETED
              and not exists (
                  select 1
                  from HotelReview review
                  where review.booking = b
              )
            order by b.updatedAt desc
            """)
    List<Booking> findCompletedReviewNotificationBookings(@Param("userId") Long userId);

    @Query(
            value = """
                    select distinct new com.hotel.hotel_backend.dto.response.PartnerBookingSummaryResponse(
                        b.id,
                        h.id,
                        h.name,
                        c.name,
                        b.checkIn,
                        b.checkOut,
                        b.totalPrice,
                        b.status,
                        b.guests,
                        b.createdAt,
                        b.expiresAt
                    )
                    from Booking b
                    join b.items bi
                    join bi.room r
                    join r.hotel h
                    left join b.contact c
                    where h.owner.id = :ownerId
                      and h.id = coalesce(:hotelId, h.id)
                      and b.status = coalesce(:status, b.status)
                      and b.checkIn >= coalesce(:checkInFrom, b.checkIn)
                      and b.checkIn <= coalesce(:checkInTo, b.checkIn)
                    order by b.createdAt desc
                    """,
            countQuery = """
                    select count(distinct b.id)
                    from Booking b
                    join b.items bi
                    join bi.room r
                    join r.hotel h
                    where h.owner.id = :ownerId
                      and h.id = coalesce(:hotelId, h.id)
                      and b.status = coalesce(:status, b.status)
                      and b.checkIn >= coalesce(:checkInFrom, b.checkIn)
                      and b.checkIn <= coalesce(:checkInTo, b.checkIn)
                    """
    )
    Page<PartnerBookingSummaryResponse> findPartnerBookingSummaries(
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("status") BookingStatus status,
            @Param("checkInFrom") LocalDate checkInFrom,
            @Param("checkInTo") LocalDate checkInTo,
            Pageable pageable
    );

    @Query("""
            select distinct new com.hotel.hotel_backend.dto.response.PartnerBookingSummaryResponse(
                b.id,
                h.id,
                h.name,
                c.name,
                b.checkIn,
                b.checkOut,
                b.totalPrice,
                b.status,
                b.guests,
                b.createdAt,
                b.expiresAt
            )
            from Booking b
            join b.items bi
            join bi.room r
            join r.hotel h
            left join b.contact c
            where h.owner.id = :ownerId
              and h.id = coalesce(:hotelId, h.id)
              and b.checkIn >= coalesce(:checkInFrom, b.checkIn)
              and b.checkIn <= coalesce(:checkInTo, b.checkIn)
            """)
    List<PartnerBookingSummaryResponse> findPartnerBookingSummariesForAnalytics(
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("checkInFrom") LocalDate checkInFrom,
            @Param("checkInTo") LocalDate checkInTo
    );

    @Query("""
            select distinct b
            from Booking b
            left join fetch b.contact c
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            where b.id = :bookingId
              and h.owner.id = :ownerId
            """)
    Optional<Booking> findPartnerBookingDetailById(@Param("ownerId") Long ownerId, @Param("bookingId") Long bookingId);

    /** Tra cứu booking theo id kèm contact/items/room/hotel — dùng cho chatbot customer (get_booking_status). */
    @Query("""
            select distinct b
            from Booking b
            left join fetch b.contact c
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            where b.id = :id
            """)
    Optional<Booking> findByIdWithDetails(@Param("id") Long id);

    /**
     * Tra cứu booking theo email hoặc số điện thoại trên contact — dùng cho chatbot customer.
     * Khách thường không nhớ mã id; truyền email và/hoặc phone (ít nhất một). So khớp email không phân biệt hoa thường.
     */
    @Query("""
            select distinct b
            from Booking b
            left join fetch b.contact c
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            where (:email is not null and lower(c.email) = lower(:email))
               or (:phone is not null and c.phone = :phone)
            order by b.createdAt desc
            """)
    List<Booking> findByContactEmailOrPhone(@Param("email") String email, @Param("phone") String phone);

    @Query("""
            select distinct b
            from Booking b
            join fetch b.items bi
            join fetch bi.room r
            join fetch r.hotel h
            where h.owner.id = :ownerId
              and h.id = :hotelId
              and b.checkIn >= :checkInFrom
              and b.checkIn <= :checkInTo
            """)
    List<Booking> findPartnerBookingsForAnalytics(
            @Param("ownerId") Long ownerId,
            @Param("hotelId") Long hotelId,
            @Param("checkInFrom") LocalDate checkInFrom,
            @Param("checkInTo") LocalDate checkInTo
    );

    @Query("""
            select distinct b
            from Booking b
            left join fetch b.items bi
            left join fetch bi.room r
            left join fetch r.hotel h
            order by b.createdAt desc
            """)
    List<Booking> findAllForAdmin();

}
