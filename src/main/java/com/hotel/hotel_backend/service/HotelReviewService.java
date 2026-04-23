package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.dto.request.CreateHotelReviewRequest;
import com.hotel.hotel_backend.dto.request.PartnerReviewReplyRequest;
import com.hotel.hotel_backend.dto.request.PartnerReviewSearchRequest;
import com.hotel.hotel_backend.dto.request.UpdateHotelReviewRequest;
import com.hotel.hotel_backend.dto.response.HotelReviewResponse;
import com.hotel.hotel_backend.entity.Booking;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.entity.HotelReview;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.HotelRepository;
import com.hotel.hotel_backend.repository.HotelReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class HotelReviewService {

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final HotelReviewRepository hotelReviewRepository;
    private final SecurityService securityService;

    /**
     * Customer muon de lai danh gia sau khi stay ket thuc thi booking nao du dieu kien?
     */
    public HotelReviewResponse createReview(CreateHotelReviewRequest request) {
        User currentUser = securityService.getCurrentUser();
        Booking booking = bookingRepository.findByIdAndUserId(request.bookingId(), currentUser.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Booking not found"));

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new ApiException(ErrorCode.CONFLICT, "Only completed bookings can be reviewed");
        }

        if (hotelReviewRepository.findByBookingId(booking.getId()).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking already has a review");
        }

        Hotel hotel = resolveHotelFromBooking(booking);
        HotelReview review = new HotelReview();
        review.setBooking(booking);
        review.setHotel(hotel);
        review.setUser(currentUser);
        review.setRating(request.rating());
        review.setComment(request.comment().trim());

        HotelReview savedReview = hotelReviewRepository.save(review);
        refreshHotelRating(hotel);
        return toResponse(savedReview);
    }

    /**
     * Customer muon sua review cua minh thi duoc phep doi rating/comment nhu the nao?
     */
    public HotelReviewResponse updateMyReview(Long reviewId, UpdateHotelReviewRequest request) {
        long userId = securityService.getCurrentPrincipal().userId();
        HotelReview review = hotelReviewRepository.findByIdAndUserId(reviewId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Review not found"));

        review.setRating(request.rating());
        review.setComment(request.comment().trim());
        HotelReview savedReview = hotelReviewRepository.save(review);
        refreshHotelRating(savedReview.getHotel());
        return toResponse(savedReview);
    }

    /**
     * Customer muon xoa review cua minh thi sau do aggregate rating cua hotel cap nhat ra sao?
     */
    public void deleteMyReview(Long reviewId) {
        long userId = securityService.getCurrentPrincipal().userId();
        HotelReview review = hotelReviewRepository.findByIdAndUserId(reviewId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Review not found"));

        Hotel hotel = review.getHotel();
        hotelReviewRepository.delete(review);
        hotelReviewRepository.flush();
        refreshHotelRating(hotel);
    }

    @Transactional(readOnly = true)
    public List<HotelReviewResponse> getHotelReviews(Long hotelId, Integer rating) {
        hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Hotel not found"));

        return hotelReviewRepository.findPublicReviews(hotelId, rating).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HotelReviewResponse> getPartnerReviews(PartnerReviewSearchRequest request) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        return hotelReviewRepository.findPartnerReviews(
                        ownerId,
                        request.getHotelId(),
                        request.getRating(),
                        request.getHasReply()
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Partner can tra loi review nao va reply do duoc gan vao review cua hotel so huu ra sao?
     */
    public HotelReviewResponse replyToReview(Long reviewId, PartnerReviewReplyRequest request) {
        long ownerId = securityService.getCurrentPrincipal().userId();
        HotelReview review = hotelReviewRepository.findPartnerOwnedReviewById(ownerId, reviewId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Review not found"));

        review.setPartnerReply(request.reply().trim());
        review.setPartnerRepliedAt(OffsetDateTime.now());
        return toResponse(hotelReviewRepository.save(review));
    }

    private Hotel resolveHotelFromBooking(Booking booking) {
        if (booking.getItems() == null || booking.getItems().isEmpty()) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking items are missing");
        }
        return booking.getItems().get(0).getRoom().getHotel();
    }

    private void refreshHotelRating(Hotel hotel) {
        Hotel managedHotel = hotelRepository.findById(hotel.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Hotel not found"));

        HotelReviewRepository.HotelRatingAggregate aggregate =
                hotelReviewRepository.findHotelRatingAggregate(managedHotel.getId());

        Double averageRating = aggregate != null ? aggregate.getAverageRating() : null;
        Long ratingCount = aggregate != null ? aggregate.getRatingCount() : null;

        managedHotel.setRatingAvg(
                averageRating == null
                        ? BigDecimal.ZERO
                        : BigDecimal.valueOf(averageRating).setScale(2, RoundingMode.HALF_UP)
        );
        managedHotel.setRatingCount(ratingCount == null ? 0 : ratingCount.intValue());
        hotelRepository.save(managedHotel);
    }

    private HotelReviewResponse toResponse(HotelReview review) {
        String reviewerName = "Guest";
        if (review.getBooking() != null
                && review.getBooking().getContact() != null
                && review.getBooking().getContact().getName() != null
                && !review.getBooking().getContact().getName().isBlank()) {
            reviewerName = review.getBooking().getContact().getName();
        }

        return new HotelReviewResponse(
                review.getId(),
                review.getBooking().getId(),
                review.getHotel().getId(),
                review.getRating(),
                review.getComment(),
                reviewerName,
                review.getPartnerReply(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                review.getPartnerRepliedAt()
        );
    }
}
