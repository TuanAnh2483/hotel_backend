package com.hotel.hotel_backend.service;

import com.hotel.hotel_backend.entity.AdminAuditLog;
import com.hotel.hotel_backend.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi audit log cho mọi hành động mutation của admin.
 * Dùng @Async để không block response — log ghi background.
 * Dùng REQUIRES_NEW để log commit độc lập dù transaction gốc rollback.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AdminAuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long adminId, String action, String targetType, Long targetId,
                    String detail, String ipAddress) {
        try {
            AdminAuditLog entry = AdminAuditLog.builder()
                    .adminId(adminId)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .detail(detail)
                    .ipAddress(ipAddress)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Audit log không được làm fail business logic
            log.error("Failed to write audit log: admin={} action={} target={}/{}",
                    adminId, action, targetType, targetId, e);
        }
    }
}
