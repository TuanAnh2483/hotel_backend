import { getToken } from "./authService";

async function partnerFetch(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...restOptions,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.message || `HTTP ${res.status}`);
  return json.data ?? json;
}

export const partnerService = {
  getCatalogOptions: () => partnerFetch("/api/catalog/options"),

  // ── Hotels ──────────────────────────────────────────────────────────
  getMyHotels: () => partnerFetch("/api/partner/hotels"),

  createHotel: (data) =>
    partnerFetch("/api/partner/hotels", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateHotel: (id, data) =>
    partnerFetch(`/api/partner/hotels/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteHotel: (id) =>
    partnerFetch(`/api/partner/hotels/${id}`, { method: "DELETE" }),

  // ── Rooms ────────────────────────────────────────────────────────────
  getRooms: (hotelId) => partnerFetch(`/api/partner/hotels/${hotelId}/rooms`),

  createRoom: (hotelId, data) =>
    partnerFetch(`/api/partner/hotels/${hotelId}/rooms`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRoom: (roomId, data) =>
    partnerFetch(`/api/partner/rooms/${roomId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  deleteRoom: (roomId) =>
    partnerFetch(`/api/partner/rooms/${roomId}`, { method: "DELETE" }),

  // ── Bookings ─────────────────────────────────────────────────────────
  getBookings: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hotelId)     q.set("hotelId",     params.hotelId);
    if (params.status)      q.set("status",      params.status);
    if (params.checkInFrom) q.set("checkInFrom", params.checkInFrom);
    if (params.checkInTo)   q.set("checkInTo",   params.checkInTo);
    q.set("page", params.page ?? 1);
    q.set("size", params.size ?? 20);
    return partnerFetch(`/api/partner/bookings?${q.toString()}`);
  },

  getBooking: (bookingId) => partnerFetch(`/api/partner/bookings/${bookingId}`),

  // ── Analytics ───────────────────────────────────────────────────────
  getAnalyticsSummary: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hotelId) q.set("hotelId", params.hotelId);
    if (params.checkInFrom) q.set("checkInFrom", params.checkInFrom);
    if (params.checkInTo) q.set("checkInTo", params.checkInTo);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return partnerFetch(`/api/partner/analytics/summary${suffix}`);
  },

  // ── Room calendar ───────────────────────────────────────────────────
  getRoomCalendar: (roomId, params) => {
    const q = new URLSearchParams();
    q.set("from", params.from);
    q.set("to", params.to);
    return partnerFetch(`/api/partner/rooms/${roomId}/calendar?${q.toString()}`);
  },

  updateRoomCalendar: (roomId, data) =>
    partnerFetch(`/api/partner/rooms/${roomId}/calendar`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // ── Refunds ─────────────────────────────────────────────────────────
  getRefunds: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hotelId) q.set("hotelId", params.hotelId);
    if (params.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return partnerFetch(`/api/partner/refunds${suffix}`);
  },

  approveRefund: (refundRequestId) =>
    partnerFetch(`/api/partner/refunds/${refundRequestId}/approve`, {
      method: "POST",
    }),

  rejectRefund: (refundRequestId) =>
    partnerFetch(`/api/partner/refunds/${refundRequestId}/reject`, {
      method: "POST",
    }),
};
