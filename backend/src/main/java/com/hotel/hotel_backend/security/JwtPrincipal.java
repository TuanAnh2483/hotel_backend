package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.entity.UserType;

public record JwtPrincipal (Long userId, String email, UserType role) {

}
