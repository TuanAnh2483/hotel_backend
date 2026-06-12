package com.hotel.hotel_backend.service.chat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Helper nhỏ dùng chung cho các chat tool service:
 * - {@link #obj} build map giữ thứ tự và CHO PHÉP null value (khác Map.of) để serialize JSON gửi Gemini.
 * - các {@code asX} parse argument do Gemini sinh ra (số có thể là Integer/Double/String).
 */
final class ChatJsonUtil {

    private ChatJsonUtil() {
    }

    static Map<String, Object> obj(Object... kv) {
        LinkedHashMap<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(String.valueOf(kv[i]), kv[i + 1]);
        }
        return m;
    }

    static String asString(Map<String, Object> args, String key) {
        Object v = args.get(key);
        return v == null ? null : String.valueOf(v);
    }

    static String asString(Map<String, Object> args, String key, String def) {
        String v = asString(args, key);
        return (v == null || v.isBlank()) ? def : v;
    }

    static Integer asInt(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v instanceof Number n) {
            return n.intValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return (int) Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    static int asInt(Map<String, Object> args, String key, int def) {
        Integer v = asInt(args, key);
        return v == null ? def : v;
    }

    static Long asLong(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v instanceof Number n) {
            return n.longValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return (long) Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    static Double asDouble(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        if (v instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /** Đọc 1 tham số mảng do Gemini sinh (List), bỏ phần tử rỗng. Chấp nhận cả String đơn lẻ. */
    static List<String> asStringList(Map<String, Object> args, String key) {
        Object v = args.get(key);
        List<String> out = new ArrayList<>();
        if (v instanceof List<?> list) {
            for (Object o : list) {
                if (o != null && !String.valueOf(o).isBlank()) {
                    out.add(String.valueOf(o).trim());
                }
            }
        } else if (v instanceof String s && !s.isBlank()) {
            out.add(s.trim());
        }
        return out;
    }

    static LocalDate asDate(Map<String, Object> args, String key) {
        String v = asString(args, key);
        if (v == null || v.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(v.trim());
        } catch (Exception ignored) {
            return null;
        }
    }
}
