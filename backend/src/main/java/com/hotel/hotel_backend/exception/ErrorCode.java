package com.hotel.hotel_backend.exception;

import org.springframework.http.HttpStatus;

public enum  ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    CONFLICT(HttpStatus.CONFLICT),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
    EMAIL_EXISTS(HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN),
    HOTEL_HAS_ROOMS(HttpStatus.BAD_REQUEST),
    PARTNER_APPLICATION_EXISTS(HttpStatus.CONFLICT),
    PARTNER_APPLICATION_INVALID_STATE(HttpStatus.BAD_REQUEST),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS);

    public final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }
}
