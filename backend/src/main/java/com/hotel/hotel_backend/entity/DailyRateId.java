package com.hotel.hotel_backend.entity;


import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.time.LocalDate;


@Embeddable
public record DailyRateId(Long roomId, LocalDate date) implements Serializable {}

