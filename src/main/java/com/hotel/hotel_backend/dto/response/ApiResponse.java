package com.hotel.hotel_backend.dto.response;

public record ApiResponse <T>(
    boolean success ,
    T data,
    ApiError error
    ){
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> fail(ApiError error) {
        return new ApiResponse<>(false, null, error);
    }

}
