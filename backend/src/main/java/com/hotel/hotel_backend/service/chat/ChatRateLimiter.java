package com.hotel.hotel_backend.service.chat;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn tần suất gọi chat theo key (IP + role) để chống spam endpoint public,
 * tránh đốt quota Gemini. In-memory fixed-window (2 cửa sổ), cùng phong cách
 * {@link ChatSessionService} — không cần Redis cho V1.
 *
 * <p>Mỗi key có 2 cửa sổ: ngắn ({@link #SHORT_WINDOW_MS}/{@link #SHORT_LIMIT}) chặn burst,
 * và dài ({@link #LONG_WINDOW_MS}/{@link #LONG_LIMIT}) chặn lạm dụng kéo dài. Vượt 1 trong 2 → chặn.
 */
@Service
public class ChatRateLimiter {

    private static final long SHORT_WINDOW_MS = 60_000L;
    private static final int SHORT_LIMIT = 20;
    private static final long LONG_WINDOW_MS = 600_000L;
    private static final int LONG_LIMIT = 80;
    private static final int MAX_KEYS = 10_000;

    private static final class Counter {
        long shortStart;
        int shortCount;
        long longStart;
        int longCount;
    }

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    /** {@code true} nếu được phép gọi; {@code false} nếu đã vượt ngưỡng (nên trả câu nhắc chờ). */
    public boolean allow(String key) {
        long now = System.currentTimeMillis();
        evictIfNeeded(now);
        Counter c = counters.computeIfAbsent(key, k -> {
            Counter init = new Counter();
            init.shortStart = now;
            init.longStart = now;
            return init;
        });
        synchronized (c) {
            if (now - c.shortStart >= SHORT_WINDOW_MS) {
                c.shortStart = now;
                c.shortCount = 0;
            }
            if (now - c.longStart >= LONG_WINDOW_MS) {
                c.longStart = now;
                c.longCount = 0;
            }
            c.shortCount++;
            c.longCount++;
            return c.shortCount <= SHORT_LIMIT && c.longCount <= LONG_LIMIT;
        }
    }

    /** Dọn cơ hội: khi map phình quá ngưỡng, bỏ các key đã hết hạn cửa sổ dài. */
    private void evictIfNeeded(long now) {
        if (counters.size() <= MAX_KEYS) {
            return;
        }
        counters.entrySet().removeIf(e -> now - e.getValue().longStart >= LONG_WINDOW_MS);
    }
}
