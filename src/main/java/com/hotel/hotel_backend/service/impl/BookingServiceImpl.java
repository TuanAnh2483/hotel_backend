package com.hotel.hotel_backend.service.impl;

import com.hotel.hotel_backend.dto.request.BookingContactItem;
import com.hotel.hotel_backend.dto.request.BookingContactRequest;
import com.hotel.hotel_backend.dto.request.BookingRoomRequest;
import com.hotel.hotel_backend.dto.request.CreateBookingRequest;
import com.hotel.hotel_backend.dto.response.BookingResponse;
import com.hotel.hotel_backend.entity.*;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.mapper.BookingMapper;
import com.hotel.hotel_backend.repository.BookingItemRepository;
import com.hotel.hotel_backend.repository.BookingRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.service.BookingService;
import com.hotel.hotel_backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingItemRepository bookingItemRepository;
    private final InventoryService inventoryService;
    private final RoomRepository roomRepository;
    private final BookingMapper bookingMapper;

    /**
     * Tạo booking mới
     */
    @Override
    @Transactional
    public BookingResponse createBooking(Long userId, CreateBookingRequest bookingRequest) {
        validateUserId(userId);

        List<BookingRoomRequest> roomRequests = requireRoomRequests(bookingRequest);
        BookingContactRequest bookingContactRequest = requirePrimaryContact(bookingRequest);

        List<RoomReservation> reservations = loadRoomReservations(roomRequests, bookingRequest);
        reserveInventory(reservations, bookingRequest);

        Booking booking = createBookingEntity(userId, bookingRequest);
        bookingRepository.save(booking);

        BookingContact contact = createBookingContact(bookingContactRequest, booking);
        booking.setContact(contact);

        double totalPrice = createBookingItems(booking, reservations, bookingRequest);
        booking.setTotalPrice(totalPrice);

        bookingRepository.save(booking);

        return bookingMapper.toBookingResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Booking> getMyBookings(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    @Transactional
    public Booking cancelBooking(Long userId, Long bookingId) {
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Booking not found"));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return booking;
        }

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ApiException(ErrorCode.CONFLICT, "Completed booking cannot be cancelled");
        }

        List<BookingItem> items = bookingItemRepository.findByBookingId(booking.getId());
        if (items.isEmpty()) {
            throw new ApiException(ErrorCode.CONFLICT, "Booking items are missing");
        }

        for (BookingItem item : items) {
            inventoryService.releaseInventory(
                    item.getRoom().getId(),
                    booking.getCheckIn(),
                    booking.getCheckOut(),
                    item.getQuantity()
            );
        }
        booking.setStatus(BookingStatus.CANCELLED);

        return bookingRepository.save(booking);
    }

    private void validateUserId(Long userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "User is required");
        }
    }

    private List<BookingRoomRequest> requireRoomRequests(CreateBookingRequest bookingRequest) {
        List<BookingRoomRequest> roomRequests = bookingRequest.getRoom();
        if (roomRequests == null || roomRequests.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Room is required");
        }
        return roomRequests;
    }

    private BookingContactRequest requirePrimaryContact(CreateBookingRequest bookingRequest) {
        List<BookingContactItem> contactItems = bookingRequest.getContact();
        if (contactItems == null || contactItems.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Contact is required");
        }

        BookingContactRequest bookingContactRequest = contactItems.get(0).contact();
        if (bookingContactRequest == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Contact is required");
        }

        return bookingContactRequest;
    }

    private List<RoomReservation> loadRoomReservations(
            List<BookingRoomRequest> roomRequests,
            CreateBookingRequest bookingRequest
    ) {
        List<RoomReservation> reservations = new ArrayList<>(roomRequests.size());
        for (BookingRoomRequest roomRequest : roomRequests) {
            Room room = roomRepository.findById(roomRequest.roomTypeId())
                    .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Room not found"));

            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw new ApiException(ErrorCode.CONFLICT, "Room is not available for booking");
            }

            inventoryService.initInventory(
                    room.getId(),
                    bookingRequest.getCheckIn(),
                    bookingRequest.getCheckOut(),
                    room.getQuantity()
            );

            reservations.add(new RoomReservation(room, roomRequest.quantity()));
        }

        return reservations;
    }

    private void reserveInventory(List<RoomReservation> reservations, CreateBookingRequest bookingRequest) {
        for (RoomReservation reservation : reservations) {
            inventoryService.reserveInventory(
                    reservation.room().getId(),
                    bookingRequest.getCheckIn(),
                    bookingRequest.getCheckOut(),
                    reservation.quantity()
            );
        }
    }

    private Booking createBookingEntity(Long userId, CreateBookingRequest bookingRequest) {
        Booking booking = bookingMapper.toBooking(bookingRequest);
        booking.setUserId(userId);
        booking.setCheckIn(bookingRequest.getCheckIn());
        booking.setCheckOut(bookingRequest.getCheckOut());
        booking.setTotalPrice(0.0);
        booking.setStatus(BookingStatus.PENDING);
        return booking;
    }

    private BookingContact createBookingContact(BookingContactRequest bookingContactRequest, Booking booking) {
        BookingContact contact = bookingMapper.toBookingContact(bookingContactRequest);
        contact.setName(bookingContactRequest.fullName());
        contact.setPhone(bookingContactRequest.phone());
        contact.setEmail(bookingContactRequest.email());
        contact.setBooking(booking);
        return contact;
    }

    private double createBookingItems(
            Booking booking,
            List<RoomReservation> reservations,
            CreateBookingRequest bookingRequest
    ) {
        double totalPrice = 0.0;
        long nights = bookingRequest.getCheckOut().toEpochDay() - bookingRequest.getCheckIn().toEpochDay();

        for (RoomReservation reservation : reservations) {
            Room room = reservation.room();
            Integer quantity = reservation.quantity();

            BookingItem item = BookingItem.builder()
                    .booking(booking)
                    .room(room)
                    .quantity(quantity)
                    .price((double) room.getPrice())
                    .build();

            bookingItemRepository.save(item);
            totalPrice += nights * item.getPrice() * item.getQuantity();
        }

        return totalPrice;
    }

    private static final class RoomReservation {
        private final Room room;
        private final Integer quantity;

        private RoomReservation(Room room, Integer quantity) {
            this.room = room;
            this.quantity = quantity;
        }

        private Room room() {
            return room;
        }

        private Integer quantity() {
            return quantity;
        }
    }
}
