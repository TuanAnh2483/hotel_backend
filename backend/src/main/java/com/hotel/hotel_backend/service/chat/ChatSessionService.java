package com.hotel.hotel_backend.service.chat;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu lịch sử hội thoại theo sessionId trong bộ nhớ (không cần DB — theo đặc tả).
 *
 * <p>Mỗi tin trong history là 1 Gemini Content map {@code {role, parts}}. Giữ tối đa
 * {@link #MAX_MESSAGES} content gần nhất để tránh phình token. Khi cắt, đảm bảo content
 * đầu tiên là tin "user" dạng text — tránh để history bắt đầu bằng functionResponse/functionCall
 * khiến Gemini báo lỗi.
 */
@Service
public class ChatSessionService {

    private static final int MAX_MESSAGES = 20;
    private static final int MAX_SESSIONS = 5000;
    private static final Duration TTL = Duration.ofHours(2);

    private static final class Entry {
        List<Map<String, Object>> history = new ArrayList<>();
        Instant lastAccess = Instant.now();
    }

    private final Map<String, Entry> sessions = new ConcurrentHashMap<>();

    /** Trả về snapshot bất biến của history hiện tại (ChatService tự copy sang list làm việc). */
    public List<Map<String, Object>> getHistory(String sessionId) {
        Entry entry = sessions.computeIfAbsent(sessionId, k -> new Entry());
        entry.lastAccess = Instant.now();
        return List.copyOf(entry.history);
    }

    public void save(String sessionId, List<Map<String, Object>> history) {
        Entry entry = sessions.computeIfAbsent(sessionId, k -> new Entry());
        entry.history = trim(history);
        entry.lastAccess = Instant.now();
        evictIfNeeded();
    }

    private List<Map<String, Object>> trim(List<Map<String, Object>> history) {
        List<Map<String, Object>> trimmed = history.size() <= MAX_MESSAGES
                ? new ArrayList<>(history)
                : new ArrayList<>(history.subList(history.size() - MAX_MESSAGES, history.size()));
        while (!trimmed.isEmpty() && !isUserText(trimmed.get(0))) {
            trimmed.remove(0);
        }
        return trimmed;
    }

    private boolean isUserText(Map<String, Object> content) {
        if (!"user".equals(content.get("role"))) {
            return false;
        }
        if (content.get("parts") instanceof List<?> parts) {
            for (Object part : parts) {
                if (part instanceof Map<?, ?> m && m.containsKey("text")) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Dọn cơ hội: khi vượt ngưỡng số session, xoá các session idle quá TTL. */
    private void evictIfNeeded() {
        if (sessions.size() <= MAX_SESSIONS) {
            return;
        }
        Instant cutoff = Instant.now().minus(TTL);
        sessions.entrySet().removeIf(e -> e.getValue().lastAccess.isBefore(cutoff));
    }
}
