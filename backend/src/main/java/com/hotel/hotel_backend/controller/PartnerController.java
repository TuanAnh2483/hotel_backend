package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.CreateRoomRequest;
import com.hotel.hotel_backend.dto.request.CreateRoomUnitRequest;
import com.hotel.hotel_backend.dto.request.CreateHotelRequest;
import com.hotel.hotel_backend.dto.request.PartnerAnalyticsSummaryRequest;
import com.hotel.hotel_backend.dto.request.PartnerBookingRefundRequest;
import com.hotel.hotel_backend.dto.request.PartnerBookingSearchRequest;
import com.hotel.hotel_backend.dto.request.PartnerReviewReplyRequest;
import com.hotel.hotel_backend.dto.request.PartnerReviewSearchRequest;
import com.hotel.hotel_backend.dto.request.PartnerRoomCalendarUpsertRequest;
import com.hotel.hotel_backend.dto.request.SetBasePricingRequest;
import com.hotel.hotel_backend.dto.request.SetCoverImageRequest;
import com.hotel.hotel_backend.dto.request.UpdateHotelRequest;
import com.hotel.hotel_backend.dto.request.UpdateRoomUnitRequest;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.HotelResponse;
import com.hotel.hotel_backend.dto.response.HotelReviewResponse;
import com.hotel.hotel_backend.dto.response.PartnerAnalyticsSummaryResponse;
import com.hotel.hotel_backend.dto.response.PartnerBookingDetailResponse;
import com.hotel.hotel_backend.dto.response.PartnerBookingPageResponse;
import com.hotel.hotel_backend.dto.response.PartnerRoomCalendarResponse;
import com.hotel.hotel_backend.dto.response.RefundRequestResponse;
import com.hotel.hotel_backend.dto.response.HotelRoomUnitResponse;
import com.hotel.hotel_backend.dto.response.RoomResponse;
import com.hotel.hotel_backend.dto.response.RoomUnitResponse;
import com.hotel.hotel_backend.entity.RefundRequestStatus;
import com.hotel.hotel_backend.service.HotelService;
import com.hotel.hotel_backend.service.HotelReviewService;
import com.hotel.hotel_backend.service.ImageStorageRouterService;
import com.hotel.hotel_backend.service.PartnerBookingService;
import com.hotel.hotel_backend.service.PartnerImageUploadService;
import com.hotel.hotel_backend.service.PartnerRoomCalendarService;
import com.hotel.hotel_backend.service.RefundRequestService;
import com.hotel.hotel_backend.service.RoomService;
import com.hotel.hotel_backend.service.RoomUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/partner")
@RequiredArgsConstructor
public class PartnerController {

    private final HotelService hotelService;
    private final RoomService roomService;
    private final RoomUnitService roomUnitService;
    private final PartnerBookingService partnerBookingService;
    private final PartnerRoomCalendarService partnerRoomCalendarService;
    private final HotelReviewService hotelReviewService;
    private final PartnerImageUploadService partnerImageUploadService;
    private final RefundRequestService refundRequestService;
    private final ImageStorageRouterService imageStorageRouterService;

    @GetMapping("/hotels")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<HotelResponse>> getMyHotels() {
        return ApiResponse.ok(hotelService.getMyHotels());
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerBookingPageResponse> getMyBookings(@Valid @ModelAttribute PartnerBookingSearchRequest request) {
        return ApiResponse.ok(partnerBookingService.getPartnerBookings(request));
    }

    @GetMapping("/refunds")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<RefundRequestResponse>> getMyRefundRequests(
            @RequestParam(required = false) Long hotelId,
            @RequestParam(required = false) RefundRequestStatus status
    ) {
        return ApiResponse.ok(refundRequestService.getPartnerRefundRequests(hotelId, status));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner muon xem cac review cua hotel minh
     * dang van hanh va loc theo rating/hasReply thi vao dau?
     */
    @GetMapping("/reviews")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<HotelReviewResponse>> getMyReviews(
            @Valid @ModelAttribute PartnerReviewSearchRequest request
    ) {
        return ApiResponse.ok(hotelReviewService.getPartnerReviews(request));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner muon nhin nhanh tong booking va
     * doanh thu theo bo loc hotel/check-in hien tai thi doc o dau?
     */
    @GetMapping("/analytics/summary")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerAnalyticsSummaryResponse> getAnalyticsSummary(
            @Valid @ModelAttribute PartnerAnalyticsSummaryRequest request
    ) {
        return ApiResponse.ok(partnerBookingService.getPartnerAnalytics(request));
    }

    @GetMapping("/bookings/{bookingId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerBookingDetailResponse> getMyBooking(@PathVariable Long bookingId) {
        return ApiResponse.ok(partnerBookingService.getPartnerBooking(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/checkin")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerBookingDetailResponse> checkinBooking(@PathVariable Long bookingId) {
        return ApiResponse.ok(partnerBookingService.checkinPartnerBooking(bookingId));
    }

    /**
     * Endpoint nay giai quyet cau hoi: khi stay da ket thuc, partner chot booking
     * sang COMPLETED o dau de lifecycle khop nghiep vu?
     */
    @PostMapping("/bookings/{bookingId}/complete")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerBookingDetailResponse> completeBooking(@PathVariable Long bookingId) {
        return ApiResponse.ok(partnerBookingService.completePartnerBooking(bookingId));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner muon xu ly mock refund cho booking
     * da thanh toan va can idempotency thi goi API nao?
     */
    @PostMapping("/bookings/{bookingId}/refund")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerBookingDetailResponse> refundBooking(
            @PathVariable Long bookingId,
            @Valid @RequestBody PartnerBookingRefundRequest request
    ) {
        return ApiResponse.ok(partnerBookingService.refundPartnerBooking(bookingId, request));
    }

    @PostMapping("/refunds/{refundRequestId}/approve")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RefundRequestResponse> approveRefundRequest(
            @PathVariable Long refundRequestId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String transferNote = body != null ? body.get("transferNote") : null;
        return ApiResponse.ok(refundRequestService.approvePartnerRefundRequest(refundRequestId, transferNote));
    }

    @PostMapping("/refunds/{refundRequestId}/reject")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RefundRequestResponse> rejectRefundRequest(@PathVariable Long refundRequestId) {
        return ApiResponse.ok(refundRequestService.rejectPartnerRefundRequest(refundRequestId));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner muon tra loi review cua khach tren
     * hotel so huu thi goi API nao?
     */
    @PutMapping("/reviews/{reviewId}/reply")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelReviewResponse> replyToReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody PartnerReviewReplyRequest request
    ) {
        return ApiResponse.ok(hotelReviewService.replyToReview(reviewId, request));
    }

    @PostMapping("/hotels")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelResponse> createHotel(
            @Valid @RequestBody CreateHotelRequest request) {
        return ApiResponse.ok(hotelService.create(request));
    }

    @PutMapping("/hotels/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelResponse> updateHotel(
            @PathVariable Long id,
            @Valid @RequestBody UpdateHotelRequest request) {
        return ApiResponse.ok(hotelService.update(id, request));
    }

    @DeleteMapping("/hotels/{id}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<Void> deleteHotel(@PathVariable Long id) {
        hotelService.delete(id);
        return ApiResponse.ok(null);
    }

    /**
     * Sets a base price (and optional minStay) across all rooms of a hotel
     * for a 1-year window from today. Designed for use by the AddPropertyWizard
     * final step so partners don't need to call upsertCalendar per room.
     */
    @PutMapping("/hotels/{id}/base-pricing")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<Void> setHotelBasePricing(
            @PathVariable Long id,
            @Valid @RequestBody SetBasePricingRequest request
    ) {
        partnerRoomCalendarService.setHotelBasePricing(id, request.basePrice(), request.minStay());
        return ApiResponse.ok(null);
    }

    /**
     * Partner uploads real image files and the backend appends generated public URLs to the hotel gallery.
     */
    @PostMapping(value = "/hotels/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelResponse> uploadHotelImages(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.ok(partnerImageUploadService.uploadHotelImages(id, files));
    }

    @DeleteMapping("/hotels/{id}/images")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelResponse> deleteHotelImage(
            @PathVariable Long id,
            @RequestParam("imageUrl") String imageUrl
    ) {
        return ApiResponse.ok(partnerImageUploadService.deleteHotelImage(id, imageUrl));
    }

    @PutMapping("/hotels/{id}/cover-image")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<HotelResponse> setHotelCoverImage(
            @PathVariable Long id,
            @Valid @RequestBody SetCoverImageRequest request
    ) {
        return ApiResponse.ok(partnerImageUploadService.setHotelCoverImage(id, request.imageUrl()));
    }

    @PostMapping("/hotels/{hotelId}/rooms")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomResponse> createRoom(
            @PathVariable Long hotelId,
            @Valid @RequestBody CreateRoomRequest request) {
        return ApiResponse.ok(roomService.create(hotelId, request));
    }

    @GetMapping("/hotels/{hotelId}/rooms")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<RoomResponse>> getRooms(
            @PathVariable Long hotelId) {
        return ApiResponse.ok(roomService.getRoomsByHotel(hotelId));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner dang ban gia va ton kho thuc te cua
     * mot room theo tung ngay ra sao trong mot range?
     */
    @GetMapping("/rooms/{roomId}/calendar")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerRoomCalendarResponse> getRoomCalendar(
            @PathVariable Long roomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(partnerRoomCalendarService.getCalendar(roomId, from, to));
    }

    /**
     * Endpoint nay giai quyet cau hoi: partner muon patch mot block ngay de sua
     * price, minStay, closed, availableRooms ma khong phai gui tung row thi lam sao?
     */
    @PutMapping("/rooms/{roomId}/calendar")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<PartnerRoomCalendarResponse> upsertRoomCalendar(
            @PathVariable Long roomId,
            @Valid @RequestBody PartnerRoomCalendarUpsertRequest request
    ) {
        return ApiResponse.ok(partnerRoomCalendarService.upsertCalendar(roomId, request));
    }

    @PutMapping("/rooms/{roomId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomResponse> updateRoom(
            @PathVariable Long roomId,
            @Valid @RequestBody CreateRoomRequest request) {
        return ApiResponse.ok(roomService.update(roomId, request));
    }

    @DeleteMapping("/rooms/{roomId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<Void> deleteRoom(@PathVariable Long roomId) {
        roomService.delete(roomId);
        return ApiResponse.ok(null);
    }

    /**
     * Partner uploads real image files and the backend appends generated public URLs to the room gallery.
     */
    @PostMapping(value = "/rooms/{roomId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomResponse> uploadRoomImages(
            @PathVariable Long roomId,
            @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.ok(partnerImageUploadService.uploadRoomImages(roomId, files));
    }

    @DeleteMapping("/rooms/{roomId}/images")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomResponse> deleteRoomImage(
            @PathVariable Long roomId,
            @RequestParam("imageUrl") String imageUrl
    ) {
        return ApiResponse.ok(partnerImageUploadService.deleteRoomImage(roomId, imageUrl));
    }

    @PutMapping("/rooms/{roomId}/cover-image")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomResponse> setRoomCoverImage(
            @PathVariable Long roomId,
            @Valid @RequestBody SetCoverImageRequest request
    ) {
        return ApiResponse.ok(partnerImageUploadService.setRoomCoverImage(roomId, request.imageUrl()));
    }

    // ── Room Units ─────────────────────────────────────────────────────────

    @GetMapping("/hotels/{hotelId}/room-units")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<HotelRoomUnitResponse>> getHotelRoomUnits(@PathVariable Long hotelId) {
        return ApiResponse.ok(roomUnitService.getUnitsByHotel(hotelId));
    }

    @GetMapping("/rooms/{roomId}/units")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<List<RoomUnitResponse>> getRoomUnits(@PathVariable Long roomId) {
        return ApiResponse.ok(roomUnitService.getUnits(roomId));
    }

    @PostMapping("/rooms/{roomId}/units")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomUnitResponse> createRoomUnit(
            @PathVariable Long roomId,
            @Valid @RequestBody CreateRoomUnitRequest request
    ) {
        return ApiResponse.ok(roomUnitService.create(roomId, request));
    }

    @PutMapping("/rooms/{roomId}/units/{unitId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomUnitResponse> updateRoomUnit(
            @PathVariable Long roomId,
            @PathVariable Long unitId,
            @Valid @RequestBody UpdateRoomUnitRequest request
    ) {
        return ApiResponse.ok(roomUnitService.update(roomId, unitId, request));
    }

    @DeleteMapping("/rooms/{roomId}/units/{unitId}")
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<Void> deleteRoomUnit(
            @PathVariable Long roomId,
            @PathVariable Long unitId
    ) {
        roomUnitService.delete(roomId, unitId);
        return ApiResponse.ok(null);
    }

    @PostMapping(value = "/rooms/{roomId}/units/{unitId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PARTNER')")
    public ApiResponse<RoomUnitResponse> uploadRoomUnitImage(
            @PathVariable Long roomId,
            @PathVariable Long unitId,
            @RequestParam("file") MultipartFile file
    ) {
        List<String> urls = imageStorageRouterService.storeRoomImages(roomId, List.of(file));
        return ApiResponse.ok(roomUnitService.setCoverImage(roomId, unitId, urls.get(0)));
    }
}
