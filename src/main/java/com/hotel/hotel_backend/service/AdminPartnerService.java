package com.hotel.hotel_backend.service;


import com.hotel.hotel_backend.entity.PartnerApplication;
import com.hotel.hotel_backend.entity.PartnerApplicationStatus;
import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.exeption.ApiException;
import com.hotel.hotel_backend.exeption.ErrorCode;
import com.hotel.hotel_backend.repository.PartnerApplicationRepository;
import com.hotel.hotel_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminPartnerService {

    private final PartnerApplicationRepository partnerApplicationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PartnerApplication> getApplications(PartnerApplicationStatus status) {
        if (status == null) {
            return partnerApplicationRepository.findAll();
        }
        return partnerApplicationRepository.findByStatus(status);
    }

    public PartnerApplication approveApplication(Long applicationId) {
        PartnerApplication partnerApplication = findApplication(applicationId);
        assertSubmitted(partnerApplication);

        partnerApplication.setStatus(PartnerApplicationStatus.APPROVED);
        partnerApplication.setRejectReason(null);

        User user = partnerApplication.getUser();
        user.setUserType(UserType.PARTNER);

        userRepository.save(user);
        return partnerApplicationRepository.save(partnerApplication);
    }

    public PartnerApplication rejectApplication(Long applicationId, String reason) {
        PartnerApplication partnerApplication = findApplication(applicationId);
        assertSubmitted(partnerApplication); //kiem tra submit

        partnerApplication.setStatus(PartnerApplicationStatus.REJECTED);
        partnerApplication.setRejectReason(reason);
        return partnerApplicationRepository.save(partnerApplication);
    }



    private PartnerApplication findApplication(Long applicationId) {
        return partnerApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Partner application not found"));
    }

    private void assertSubmitted(PartnerApplication partnerApplication) {
        if (partnerApplication.getStatus() != PartnerApplicationStatus.SUBMITTED) {
            throw new ApiException(
                    ErrorCode.PARTNER_APPLICATION_INVALID_STATE,
                    "Only submitted application can be reviewed"
            );
        }
    }
}
