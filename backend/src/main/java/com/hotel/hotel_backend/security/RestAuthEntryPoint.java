package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.dto.response.ApiError;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.exception.ErrorCode;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
@Component
public class RestAuthEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper;

    public RestAuthEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        // 401: chưa đăng nhập / token không hợp lệ
        var err = new ApiError(
                ErrorCode.UNAUTHORIZED.name(),
                "Chưa đăng nhập hoặc token không hợp lệ",
                List.of()
        );


        response.setStatus(ErrorCode.UNAUTHORIZED.status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.fail(err));
    }
}
