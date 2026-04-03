package com.hotel.hotel_backend.controller;

import com.hotel.hotel_backend.dto.request.AdminRejectPartnerRequest;
import com.hotel.hotel_backend.dto.response.AdminPartnerApplicationResponse;
import com.hotel.hotel_backend.dto.response.ApiResponse;
import com.hotel.hotel_backend.dto.response.PartnerApplicationResponse;
import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PartnerApplicationStatus;
import com.hotel.hotel_backend.service.AdminPartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.hotel.hotel_backend.dto.response.ApiResponse.ok;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminPartnerService adminPartnerService;

    @GetMapping("/partner-applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AdminPartnerApplicationResponse>> getPartnerApplications(
            @RequestParam(required = false) PartnerApplicationStatus status
    ) {
        return ok(adminPartnerService.getApplications(status)
                .stream()
                .map(this::toAdminPartnerApplicationResponse)
                .toList());
    }

    @PostMapping("/partner-applications/{applicationId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PartnerApplicationResponse> approvePartnerApplication(@PathVariable Long applicationId) {
        return ok(toPartnerApplicationResponse(adminPartnerService.approveApplication(applicationId)));
    }

    @PostMapping("/partner-applications/{applicationId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PartnerApplicationResponse> rejectPartnerApplication(
            @PathVariable Long applicationId,
            @Valid @RequestBody AdminRejectPartnerRequest request
    ) {
        return ok(toPartnerApplicationResponse(adminPartnerService.rejectApplication(applicationId, request.reason())));
    }

    private PartnerApplicationResponse toPartnerApplicationResponse(PartnerApplication application) {
        return new PartnerApplicationResponse(
                application.getId(),
                application.getStatus().name(),
                application.getBussinessName()
        );
    }

    private AdminPartnerApplicationResponse toAdminPartnerApplicationResponse(PartnerApplication application) {
        return new AdminPartnerApplicationResponse(
                application.getId(),
                application.getUser().getId(),
                application.getEmail(),
                application.getPhoneNumber(),
                application.getBussinessName(),
                application.getStatus().name()
        );
    }
}


