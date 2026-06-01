package com.hotel.hotel_backend.exception;

public class BadRequestException extends RuntimeException {
    private final ErrorCode code ;
    public BadRequestException(String message,ErrorCode  code) {
        super(message);
        this.code = code;

    }
}
