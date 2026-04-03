package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PartnerApplicationStatus;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.PartnerApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;

@Service
@RequiredArgsConstructor
@Transactional
public class PartnerOnboardingService {

    //Status to start
    private static final EnumSet<PartnerApplicationStatus> BLOCKING_STATUSES = EnumSet.of(
            PartnerApplicationStatus.DRAFT,
            PartnerApplicationStatus.SUBMITTED,
            PartnerApplicationStatus.UNDER_REVIEW,
            PartnerApplicationStatus.APPROVED
    );

    private final PartnerApplicationRepository partnerApplicationRepository;

    /**
     * Start a new partner application in DRAFT status.
     *
     * Important:
     * Starting onboarding does NOT grant PARTNER role.
     */
    public PartnerApplication startPartnerApplication(
            User currentUser,
            String businessName,
            String email,
            String phone
    ) {
        if (currentUser.getUserType() != UserType.CUSTOMER) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Only customers can start partner onboarding");
        }

        if (partnerApplicationRepository.existsByUserIdAndStatusIn(currentUser.getId(), BLOCKING_STATUSES)) {
            throw new ApiException(
                    ErrorCode.PARTNER_APPLICATION_EXISTS,
                    "You already have an active partner application"
            );
        }

        PartnerApplication partnerApplication = new PartnerApplication();
        partnerApplication.setUser(currentUser);
        partnerApplication.setEmail(email);
        partnerApplication.setBussinessName(businessName);
        partnerApplication.setPhoneNumber(phone);
        partnerApplication.setStatus(PartnerApplicationStatus.DRAFT);

        return partnerApplicationRepository.save(partnerApplication);
    }


    /**
     * Submit partner application.
     *
     * Business rules:
     * - Application must belong to current user
     * - Only DRAFT application can be submitted
     */
    public PartnerApplication submitPartnerApplication(User currentUser, Long applicationId) {
        PartnerApplication partnerApplication = partnerApplicationRepository.findByIdAndUserId(applicationId, currentUser.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Partner application not found"));

        if (partnerApplication.getStatus() != PartnerApplicationStatus.DRAFT) {
            throw new ApiException(
                    ErrorCode.PARTNER_APPLICATION_INVALID_STATE,
                    "Only draft application can be submitted"
            );
        }
        partnerApplication.setStatus(PartnerApplicationStatus.SUBMITTED);
        return partnerApplicationRepository.save(partnerApplication);
    }
}
