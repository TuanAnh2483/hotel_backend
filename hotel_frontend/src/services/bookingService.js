import { getToken } from "./authService";

const BASE = "";

async function authedFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.error?.message || json.message || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return json.data ?? json;
}

export const bookingService = {
  // Returns BookingQuoteResponse: { hotelId, hotelName, checkIn, checkOut, totalPrice, items }
  getQuote({ checkIn, checkOut, rooms }) {
    return authedFetch("/api/bookings/quote", {
      method: "POST",
      body: JSON.stringify({ checkIn, checkOut, room: rooms }),
    });
  },

  // Returns BookingResponse: { bookingId, checkIn, checkOut, totalPrice, status, expiresAt, items, contact }
  createBooking({ checkIn, checkOut, rooms, contact }) {
    return authedFetch("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ checkIn, checkOut, room: rooms, contact }),
    });
  },

  // Returns List<BookingResponse>
  getMyBookings() {
    return authedFetch("/api/bookings/me");
  },

  // Returns BookingResponse
  getBooking(bookingId) {
    return authedFetch(`/api/bookings/${bookingId}`);
  },

  // Returns BookingResponse (with updated status)
  payBooking(bookingId, { simulateSuccess, clientRequestId }) {
    return authedFetch(`/api/bookings/${bookingId}/pay`, {
      method: "POST",
      body: JSON.stringify({ simulateSuccess, clientRequestId }),
    });
  },

  // Returns PaymentSessionResponse for VietQR/SePay transfer flow.
  createPaymentSession(bookingId) {
    return authedFetch(`/api/bookings/${bookingId}/payment-session`, {
      method: "POST",
    });
  },

  // Returns List<BookingPaymentTransactionResponse>
  getPaymentHistory(bookingId) {
    return authedFetch(`/api/bookings/${bookingId}/payments`);
  },

  // Returns BookingResponse (with CANCELLED status)
  cancelBooking(bookingId) {
    return authedFetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
  },

  getRefundRequest(bookingId) {
    return authedFetch(`/api/bookings/${bookingId}/refund-request`).catch((error) => {
      if (error.status === 404) return null;
      throw error;
    });
  },

  createRefundRequest(bookingId, { reason, note }) {
    return authedFetch(`/api/bookings/${bookingId}/refund-request`, {
      method: "POST",
      body: JSON.stringify({ reason, note }),
    });
  },
};
