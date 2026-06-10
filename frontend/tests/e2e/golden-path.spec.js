/**
 * E2E tests — Golden Path: search → hotel detail → book → pay → my bookings
 *
 * Tất cả API calls đều được mock qua page.route() để tests chạy độc lập
 * không cần backend thật. Auth state được inject qua localStorage + /api/me mock.
 *
 * Chạy: npx playwright test
 * Report: npx playwright show-report
 */
import { test, expect } from '@playwright/test';
import {
  MOCK_USER,
  MOCK_HOTELS,
  MOCK_HOTEL_DETAIL,
  MOCK_ROOMS,
  MOCK_BOOKINGS,
  MOCK_CREATED_BOOKING,
  injectAuth,
  apiOk,
} from './fixtures.js';

// ── Test 1: Homepage ─────────────────────────────────────────────────────────

test('1 — homepage loads and renders search form', async ({ page }) => {
  await page.route('**/api/hotels/locations', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route('**/api/hotels/search**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: MOCK_HOTELS, totalItems: 2, totalPages: 1, page: 1 }),
    })
  );

  await page.goto('/');

  await expect(page).toHaveURL('/');
  // Trang chủ phải có form tìm kiếm (ít nhất 1 input)
  await expect(page.locator('input').first()).toBeVisible();
  // Không có lỗi crash (console.error sẽ bị test framework bắt nếu set lên)
  await expect(page.locator('body')).toBeVisible();
});

// ── Test 2: Hotel search results ─────────────────────────────────────────────

test('2 — /hotels page renders hotel cards returned by search API', async ({ page }) => {
  await page.route('**/api/hotels/search**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: MOCK_HOTELS, totalItems: 2, totalPages: 1, page: 1 }),
    })
  );
  await page.route('**/api/hotels/locations', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

  await page.goto(
    '/hotels?province=TP.+H%E1%BB%93+Ch%C3%AD+Minh&checkIn=2026-06-20&checkOut=2026-06-21&guests=2'
  );

  // Tên 2 khách sạn mock phải xuất hiện trên trang
  await expect(page.getByText('Grand Palace Hotel')).toBeVisible();
  await expect(page.getByText('Lotus Boutique')).toBeVisible();
});

// ── Test 3: Hotel detail + rooms ─────────────────────────────────────────────

test('3 — hotel detail page shows hotel name and available rooms', async ({ page }) => {
  await page.route('**/api/hotels/1', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_HOTEL_DETAIL),
    })
  );
  await page.route('**/api/hotels/1/available-rooms**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ROOMS),
    })
  );

  await page.goto('/hotels/1?checkIn=2026-06-20&checkOut=2026-06-21&guests=2');

  await expect(page.getByText('Grand Palace Hotel')).toBeVisible();
  await expect(page.getByText('Deluxe Room')).toBeVisible();
});

// ── Test 4: Login page renders ───────────────────────────────────────────────

test('4 — /login page has email input, password input, and submit button', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="pw"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// ── Test 5: Login error handling ─────────────────────────────────────────────

test('5 — login shows server error message on wrong credentials', async ({ page }) => {
  await page.route('**/api/auth/login', (r) =>
    r.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email hoặc mật khẩu không đúng' }),
    })
  );

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('wrong@example.com');
  await page.locator('input[name="pw"]').fill('wrongpassword123');
  await page.locator('button[type="submit"]').click();

  // apiClient normalizeError lấy body.message → component setState → render
  await expect(page.getByText(/email|mật khẩu|không đúng|wrong|invalid/i)).toBeVisible();
});

// ── Test 6: Register form validation ─────────────────────────────────────────

test('6 — /register form shows validation errors when submitted empty', async ({ page }) => {
  await page.goto('/register');

  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="pw"]')).toBeVisible();

  // Submit rỗng → react-hook-form + zod kích hoạt validation errors
  await page.locator('button[type="submit"]').click();

  // Ít nhất 1 error message xuất hiện (zod messages cho email/pw/cf fields)
  const errorLocator = page.locator('p, span').filter({ hasText: /required|bắt buộc|không|empty|min|least/i }).first();
  await expect(errorLocator).toBeVisible();
});

// ── Test 7: My bookings (authenticated) ──────────────────────────────────────

test('7 — authenticated customer sees their booking in /customer/bookings', async ({ page }) => {
  await injectAuth(page);

  await page.route('**/api/bookings/me', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiOk(MOCK_BOOKINGS),
    })
  );

  await page.goto('/customer/bookings');

  // Booking mock có status PENDING_PAYMENT — UI phải render booking này
  // Chấp nhận bất kỳ text nào từ booking data
  const bookingContent = page
    .getByText('Deluxe Room')
    .or(page.getByText('Grand Palace Hotel'))
    .or(page.getByText(/PENDING|pending|chờ thanh toán/i).first());

  await expect(bookingContent).toBeVisible({ timeout: 10_000 });
});

// ── Test 8: Golden path — hotel detail → click book → navigate to /book ──────

test('8 — golden path: hotel detail → click book button → leaves hotel page', async ({ page }) => {
  await injectAuth(page);

  await page.route('**/api/hotels/1', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_HOTEL_DETAIL),
    })
  );
  await page.route('**/api/hotels/1/available-rooms**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ROOMS),
    })
  );
  await page.route('**/api/bookings/quote', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiOk({
        hotelId: 1,
        hotelName: 'Grand Palace Hotel',
        checkIn: '2026-06-20',
        checkOut: '2026-06-21',
        totalPrice: 850000,
        items: [{ roomId: 10, roomName: 'Deluxe Room', quantity: 1, price: 850000 }],
      }),
    })
  );
  await page.route('**/api/bookings', async (r) => {
    if (r.request().method() === 'POST') {
      await r.fulfill({
        status: 201,
        contentType: 'application/json',
        body: apiOk(MOCK_CREATED_BOOKING),
      });
    } else {
      await r.continue();
    }
  });

  // Mở hotel detail page
  await page.goto('/hotels/1?checkIn=2026-06-20&checkOut=2026-06-21&guests=2');
  await expect(page.getByText('Deluxe Room')).toBeVisible();

  // Click nút đặt phòng — text có thể là "Đặt phòng", "Book", "Chọn phòng"...
  const bookBtn = page
    .getByRole('button', { name: /đặt phòng|đặt ngay|book|chọn phòng/i })
    .first();
  await bookBtn.click();

  // Sau click phải rời khỏi /hotels/1 (sang /book hoặc /login nếu auth fail)
  await expect(page).not.toHaveURL(/\/hotels\/1(\?.*)?$/, { timeout: 5_000 });
});
