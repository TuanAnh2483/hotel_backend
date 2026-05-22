package com.hotel.hotel_backend.entity;

public enum BookingMode {
    /** Khách đặt từng phòng / room type (Hotel, Resort, Hostel, Guest House). */
    BY_ROOM,

    /** Khách thuê nguyên căn (Villa, Apartment, Homestay kiểu toàn bộ nhà). */
    ENTIRE
}