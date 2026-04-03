package com.hotel.hotel_backend.exeption;

public class ApiException extends  RuntimeException {
    private final ErrorCode code ;

    public ApiException(ErrorCode code) {
        super();
        this.code = code;
    }

    public ApiException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode getCode () {
        return code;
    }
}
