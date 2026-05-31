package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.dto.response.ApiError;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.exception.ErrorCode;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {
    private final ObjectMapper objectMapper;

    public RestAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

    }




    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException)
            throws IOException {
        // 403: đã login nhưng không đủ quyền
        var err = new ApiError(
                ErrorCode.FORBIDDEN.name(),
                "Bạn không có quyền truy cập ",
                List.of()
        );
        response.setStatus(ErrorCode.FORBIDDEN.status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiResponse.fail(err));
    }
}
