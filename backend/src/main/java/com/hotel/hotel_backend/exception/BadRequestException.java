package com.hotel.hotel_backend.exeption;

public class BadRequestException extends RuntimeException {
    private final ErrorCode code ;
    public BadRequestException(String message,ErrorCode  code) {
        super(message);
        this.code = code;

    }
}
