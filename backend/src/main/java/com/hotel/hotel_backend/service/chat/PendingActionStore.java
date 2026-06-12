package com.hotel.hotel_backend.service.chat;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu tạm "thao tác ghi đang chờ xác nhận" theo sessionId. Khi model quyết định gọi 1 write tool,
 * orchestrator KHÔNG thực thi ngay mà lưu vào đây + gửi thẻ xác nhận xuống client; chỉ khi client
 * bấm "Có" (confirm=true) thì pop ra thực thi. Mỗi session giữ tối đa 1 pending, TTL ngắn.
 */
@Service
public class PendingActionStore {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final int MAX_ENTRIES = 5000;

    /** Thao tác chờ: role + tên tool + args do model sinh. */
    public record PendingAction(ChatRole role, String toolName, Map<String, Object> args, Instant createdAt) {
        boolean isExpired() {
            return createdAt.plus(TTL).isBefore(Instant.now());
        }
    }

    private final Map<String, PendingAction> pending = new ConcurrentHashMap<>();

    public void put(String sessionId, ChatRole role, String toolName, Map<String, Object> args) {
        evictIfNeeded();
        pending.put(sessionId, new PendingAction(role, toolName, args, Instant.now()));
    }

    /** Lấy & xoá pending của session (chỉ trả nếu còn hạn và đúng role). */
    public PendingAction take(String sessionId, ChatRole role) {
        PendingAction action = pending.remove(sessionId);
        if (action == null || action.isExpired() || action.role() != role) {
            return null;
        }
        return action;
    }

    public void clear(String sessionId) {
        pending.remove(sessionId);
    }

    private void evictIfNeeded() {
        if (pending.size() <= MAX_ENTRIES) {
            return;
        }
        pending.entrySet().removeIf(e -> e.getValue().isExpired());
    }
}
