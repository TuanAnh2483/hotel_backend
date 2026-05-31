package com.hotel.hotel_backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({
            "/",
            "/login",
            "/register",
            "/forgot-password",
            "/reset-password",
            "/verify-email",
            "/hotels",
            "/hotels/{hotelId}",
            "/book",
            "/profile",
            "/become-partner",
            "/unauthorized",
            "/customer",
            "/customer/{section}",
            "/customer/{section}/{itemId}",
            "/partner",
            "/partner/{section}",
            "/partner/{section}/{itemId}",
            "/admin",
            "/admin/{section}",
            "/payment/{value:[^\\.]+}"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
