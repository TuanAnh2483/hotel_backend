package com.hotel.hotel_backend.service.chat;

/** Phân biệt luồng chat customer (public) và partner (JWT) trong orchestrator. */
public enum ChatRole {
    CUSTOMER,
    PARTNER
}
