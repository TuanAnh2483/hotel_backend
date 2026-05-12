package com.hotel.hotel_backend.entity;

import lombok.Builder;
import lombok.Getter;


    @Getter
    @Builder
    public class OccupancyResult {

        private int activeBookings;

        private int velocity;

        private double occupancy;  // chiếm dụng

        private String demand;  // yêu cầu

    }

