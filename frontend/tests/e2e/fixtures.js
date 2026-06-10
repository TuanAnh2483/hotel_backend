/**
 * Shared mock data và helper cho Playwright E2E tests.
 * Tất cả API response mock đều dùng định dạng ApiResponse<T> của backend:
 *   { success: true, data: T }
 * apiClient.js unwrap thành T trước khi trả cho caller.
 */

export const MOCK_USER = {
  userId: 999,
  email: 'e2e@vluhhotelhub.vn',
  userType: 'CUSTOMER',
  fullName: 'E2E Test User',
};

export const MOCK_HOTELS = [
  {
    hotelId: 1,
    name: 'Grand Palace Hotel',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    address: '123 Nguyễn Huệ, Quận 1',
    ratingAvg: 4.5,
    ratingCount: 120,
    minPrice: 850000,
    availableRoomTypes: 3,
    availableUnits: 5,
    coverImageUrl: '',
    imageUrls: [],
    hotelType: 'HOTEL',
  },
  {
    hotelId: 2,
    name: 'Lotus Boutique',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 3',
    address: '45 Lê Văn Sỹ',
    ratingAvg: 4.2,
    ratingCount: 85,
    minPrice: 650000,
    availableRoomTypes: 2,
    availableUnits: 3,
    coverImageUrl: '',
    imageUrls: [],
    hotelType: 'HOTEL',
  },
];

export const MOCK_HOTEL_DETAIL = {
  hotelId: 1,
  name: 'Grand Palace Hotel',
  province: 'TP. Hồ Chí Minh',
  district: 'Quận 1',
  address: '123 Nguyễn Huệ, Quận 1',
  description: 'Khách sạn 5 sao tại trung tâm TP.HCM',
  ratingAvg: 4.5,
  ratingCount: 120,
  hotelType: 'HOTEL',
  starLevel: 5,
  amenities: ['WIFI', 'POOL'],
  coverImageUrl: '',
  imageUrls: [],
  bookingMode: 'BY_ROOM',
  cancellationPolicy: 'MODERATE',
};

export const MOCK_ROOMS = [
  {
    roomId: 10,
    name: 'Deluxe Room',
    capacity: 2,
    stayPrice: 850000,
    availableUnits: 3,
    coverImageUrl: '',
    imageUrls: [],
    description: 'Phòng Deluxe thoải mái với view thành phố',
    roomCategory: 'DELUXE',
    bedType: 'DOUBLE',
    amenities: ['WIFI', 'AC'],
    customAmenities: [],
  },
];

export const MOCK_BOOKINGS = [
  {
    bookingId: 100,
    userId: 999,
    checkIn: '2026-06-20',
    checkOut: '2026-06-22',
    totalPrice: 1700000,
    status: 'PENDING_PAYMENT',
    guests: 2,
    createdAt: '2026-06-10T08:00:00',
    expiresAt: '2099-01-01T00:00:00',
    items: [
      { roomId: 10, roomName: 'Deluxe Room', quantity: 1, price: 1700000 },
    ],
    contact: {
      name: 'E2E Test User',
      phone: '0901234567',
      email: 'e2e@vluhhotelhub.vn',
    },
  },
];

export const MOCK_CREATED_BOOKING = {
  bookingId: 101,
  status: 'PENDING_PAYMENT',
  checkIn: '2026-06-20',
  checkOut: '2026-06-21',
  totalPrice: 850000,
  guests: 2,
  createdAt: '2026-06-10T10:00:00',
  expiresAt: '2099-01-01T00:00:00',
  items: [{ roomId: 10, roomName: 'Deluxe Room', quantity: 1, price: 850000 }],
  contact: {
    name: 'E2E Test User',
    phone: '0901234567',
    email: 'e2e@vluhhotelhub.vn',
  },
};

/**
 * Wrap T vào ApiResponse envelope — apiClient.js unwrap thành T khi nhận.
 */
export function apiOk(data) {
  return JSON.stringify({ success: true, data });
}

/**
 * Inject fake auth session trước khi page load.
 *
 * - addInitScript: chạy trước mọi JS trên page → localStorage đã có token + user
 *   khi React mount → AuthContext.useState(() => getStoredUser()) đọc được ngay.
 * - Mock /api/me: AuthContext gọi getCurrentUser() khi thấy token trong storage;
 *   mock trả về user để AuthContext không clearSession().
 */
export async function injectAuth(page, user = MOCK_USER) {
  await page.addInitScript(({ userData }) => {
    localStorage.setItem('token', 'e2e-fake-jwt');
    localStorage.setItem('user', JSON.stringify(userData));
  }, { userData: user });

  // apiOk wraps user → apiClient unwrap → AuthContext nhận được user object
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: apiOk(user),
    })
  );
}
