/**
 * k6 Performance Benchmark — VLU HOTEL HUB
 *
 * Test scenario: 100 concurrent users — golden path flow
 *   Stage 1: Ramp-up   0 → 100 users trong 30s
 *   Stage 2: Sustained 100 users trong 60s
 *   Stage 3: Ramp-down 100 → 0 users trong 30s
 *
 * Chạy:
 *   k6 run performance/k6-load-test.js
 *   k6 run --out json=performance/results.json performance/k6-load-test.js
 *
 * Yêu cầu:
 *   - Backend đang chạy trên http://localhost:8080
 *   - Có ít nhất 1 khách sạn với phòng trống trong DB
 *   - Biến môi trường: TEST_BASE_URL (mặc định localhost:8080)
 *
 * Cài k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.TEST_BASE_URL || 'http://localhost:8080';

// Thông tin test account (cần tạo trước trong DB)
const TEST_EMAIL    = __ENV.TEST_EMAIL    || 'k6-test@vluhhotelhub.vn';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'Test@12345';

// Ngày check-in/out hợp lệ (cần ở tương lai so với ngày test)
const CHECK_IN  = __ENV.CHECK_IN  || '2026-08-01';
const CHECK_OUT = __ENV.CHECK_OUT || '2026-08-02';

// ── Custom metrics ────────────────────────────────────────────────────────────

const searchErrors    = new Counter('search_errors');
const bookingErrors   = new Counter('booking_errors');
const authErrors      = new Counter('auth_errors');
const searchDuration  = new Trend('search_duration_ms', true);
const bookingDuration = new Trend('booking_duration_ms', true);

// ── Load profile ──────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp-up: 0 → 100 users
    { duration: '60s', target: 100 },  // Sustained: giữ 100 users
    { duration: '30s', target: 0   },  // Ramp-down: 100 → 0 users
  ],

  thresholds: {
    // 95% requests phải hoàn thành trong 2s
    http_req_duration: ['p(95)<2000'],
    // Tỉ lệ lỗi HTTP < 5%
    http_req_failed: ['rate<0.05'],
    // Search response time p95 < 1.5s
    search_duration_ms: ['p(95)<1500'],
    // Booking creation p95 < 3s (bao gồm inventory reserve + optimistic lock)
    booking_duration_ms: ['p(95)<3000'],
  },

  // Tóm tắt cuối test
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function post(url, body, headers = JSON_HEADERS) {
  return http.post(url, JSON.stringify(body), { headers });
}

function get(url, token) {
  return http.get(url, { headers: authHeaders(token) });
}

// Login và lấy access token. Trả null nếu fail.
function login() {
  const res = post(`${BASE_URL}/api/auth/login`, {
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const ok = check(res, {
    'login: status 200':       (r) => r.status === 200,
    'login: has accessToken':  (r) => {
      try { return !!JSON.parse(r.body).data?.accessToken; } catch { return false; }
    },
  });

  if (!ok) { authErrors.add(1); return null; }

  try {
    return JSON.parse(res.body).data.accessToken;
  } catch {
    authErrors.add(1);
    return null;
  }
}

// ── Main VU scenario ──────────────────────────────────────────────────────────

export default function () {
  // ── Group 1: Public hotel search (không cần auth) ──────────────────────────
  group('hotel_search', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/hotels/search?province=TP.+H%E1%BB%93+Ch%C3%AD+Minh` +
      `&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2&rooms=1&page=1&size=10`
    );
    searchDuration.add(Date.now() - start);

    const ok = check(res, {
      'search: status 200':      (r) => r.status === 200,
      'search: returns items':   (r) => {
        try { return Array.isArray(JSON.parse(r.body).data?.items ?? JSON.parse(r.body).items); }
        catch { return false; }
      },
      'search: response < 1.5s': (r) => r.timings.duration < 1500,
    });
    if (!ok) searchErrors.add(1);
  });

  sleep(0.5);

  // ── Group 2: Hotel detail page ─────────────────────────────────────────────
  group('hotel_detail', () => {
    const res = http.get(`${BASE_URL}/api/hotels/1`);
    check(res, {
      'hotel_detail: status 200':    (r) => r.status === 200,
      'hotel_detail: has hotelId':   (r) => {
        try { const b = JSON.parse(r.body); return !!(b.data?.hotelId ?? b.hotelId); }
        catch { return false; }
      },
    });
  });

  sleep(0.3);

  // ── Group 3: Available rooms ───────────────────────────────────────────────
  group('available_rooms', () => {
    const res = http.get(
      `${BASE_URL}/api/hotels/1/available-rooms` +
      `?checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&adults=2&rooms=1`
    );
    check(res, {
      'rooms: status 200':     (r) => r.status === 200,
      'rooms: is array':       (r) => {
        try { const b = JSON.parse(r.body); return Array.isArray(b.data ?? b); }
        catch { return false; }
      },
    });
  });

  sleep(0.5);

  // ── Group 4: Auth + booking creation ──────────────────────────────────────
  // Chỉ 30% VU thực hiện booking (simulate tỉ lệ conversion thực tế)
  if (Math.random() < 0.3) {
    group('booking_flow', () => {
      const token = login();
      if (!token) return;

      sleep(0.2);

      // Quote trước khi book
      const quoteRes = post(
        `${BASE_URL}/api/bookings/quote`,
        {
          checkIn:  CHECK_IN,
          checkOut: CHECK_OUT,
          room: [{ roomTypeId: 10, quantity: 1 }],
        },
        authHeaders(token)
      );
      check(quoteRes, { 'quote: status 200': (r) => r.status === 200 });

      sleep(0.3);

      // Tạo booking với idempotency key
      const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
      const start = Date.now();
      const bookRes = post(
        `${BASE_URL}/api/bookings`,
        {
          checkIn:  CHECK_IN,
          checkOut: CHECK_OUT,
          guests:   2,
          room: [{ roomTypeId: 10, quantity: 1 }],
          contact: {
            fullName: 'K6 Test User',
            phone:    '0901234567',
            email:    TEST_EMAIL,
          },
        },
        {
          ...authHeaders(token),
          'Idempotency-Key': idempotencyKey,
        }
      );
      bookingDuration.add(Date.now() - start);

      const bookOk = check(bookRes, {
        'booking: status 201':          (r) => r.status === 201,
        'booking: has bookingId':       (r) => {
          try { const b = JSON.parse(r.body); return !!(b.data?.bookingId); }
          catch { return false; }
        },
        'booking: PENDING_PAYMENT':     (r) => {
          try { return JSON.parse(r.body).data?.status === 'PENDING_PAYMENT'; }
          catch { return false; }
        },
        'booking: response < 3s':       (r) => r.timings.duration < 3000,
      });
      if (!bookOk) bookingErrors.add(1);

      sleep(0.2);

      // Xem danh sách booking của mình
      const myBookingsRes = get(`${BASE_URL}/api/bookings/me`, token);
      check(myBookingsRes, {
        'my_bookings: status 200': (r) => r.status === 200,
        'my_bookings: is array':   (r) => {
          try { return Array.isArray(JSON.parse(r.body).data); }
          catch { return false; }
        },
      });
    });
  }

  sleep(1);
}

// ── Setup: in-test verification ───────────────────────────────────────────────

export function handleSummary(data) {
  const passed  = Object.values(data.metrics)
    .filter((m) => m.thresholds)
    .every((m) => Object.values(m.thresholds).every((t) => !t.ok === false));

  return {
    stdout: `
╔══════════════════════════════════════════════════════════╗
║         VLU HOTEL HUB — k6 Performance Summary           ║
╠══════════════════════════════════════════════════════════╣
║  http_req_duration p(95) : ${
  String((data.metrics.http_req_duration?.values?.['p(95)'] ?? 0).toFixed(0)).padStart(6)
} ms   (threshold: <2000ms)  ║
║  http_req_failed  rate   : ${
  String(((data.metrics.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)).padStart(6)
} %    (threshold: <5%)      ║
║  search p(95)            : ${
  String((data.metrics.search_duration_ms?.values?.['p(95)'] ?? 0).toFixed(0)).padStart(6)
} ms   (threshold: <1500ms)  ║
║  booking p(95)           : ${
  String((data.metrics.booking_duration_ms?.values?.['p(95)'] ?? 0).toFixed(0)).padStart(6)
} ms   (threshold: <3000ms)  ║
║  search_errors           : ${
  String(data.metrics.search_errors?.values?.count ?? 0).padStart(6)
}                            ║
║  booking_errors          : ${
  String(data.metrics.booking_errors?.values?.count ?? 0).padStart(6)
}                            ║
╠══════════════════════════════════════════════════════════╣
║  Total requests  : ${
  String(data.metrics.http_reqs?.values?.count ?? 0).padStart(8)
}                              ║
║  Peak VUs        : ${
  String(data.metrics.vus_max?.values?.max ?? 0).padStart(8)
}                              ║
╚══════════════════════════════════════════════════════════╝
`,
  };
}
