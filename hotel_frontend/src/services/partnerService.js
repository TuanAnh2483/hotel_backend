import { getToken } from "./authService";

async function partnerFetch(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, body, ...restOptions } = options;
  const isFormData = body instanceof FormData;
  const res = await fetch(path, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body,
    ...restOptions,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.message || `HTTP ${res.status}`);
  return json.data ?? json;
}

function buildImageFormData(files) { // append nhiều file
  const formData = new FormData();
  Array.from(files || []).forEach((file) => {
    formData.append("files", file);
  });
  return formData;
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


    //api
  uploadHotelImages: (id, files) =>
    partnerFetch(`/api/partner/hotels/${id}/images`, {
      method: "POST",
      body: buildImageFormData(files),
    }),

  deleteHotelImage: (id, imageUrl) =>
    partnerFetch(`/api/partner/hotels/${id}/images?${new URLSearchParams({ imageUrl })}`, {
      method: "DELETE",
    }),

  setHotelCoverImage: (id, imageUrl) =>
    partnerFetch(`/api/partner/hotels/${id}/cover-image`, {
      method: "PUT",
      body: JSON.stringify({ imageUrl }),
    }),

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

  uploadRoomImages: (roomId, files) =>
    partnerFetch(`/api/partner/rooms/${roomId}/images`, {
      method: "POST",
      body: buildImageFormData(files),
    }),

  deleteRoomImage: (roomId, imageUrl) =>
    partnerFetch(`/api/partner/rooms/${roomId}/images?${new URLSearchParams({ imageUrl })}`, {
      method: "DELETE",
    }),

  setRoomCoverImage: (roomId, imageUrl) =>
    partnerFetch(`/api/partner/rooms/${roomId}/cover-image`, {
      method: "PUT",
      body: JSON.stringify({ imageUrl }),
    }),

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

  completeBooking: (bookingId) =>
    partnerFetch(`/api/partner/bookings/${bookingId}/complete`, {
      method: "POST",
    }),

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

  // ── AI Price Suggestions ─────────────────────────────────────────────
  getPriceSuggestions: (roomId, from, to) =>
    partnerFetch(`/api/partner/rooms/${roomId}/price-suggestions?${new URLSearchParams({ from, to })}`),

  submitPriceFeedback: (roomId, payload) =>
    partnerFetch(`/api/partner/rooms/${roomId}/price-feedback`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getRevenueAnalytics: (roomId) =>
    partnerFetch(`/api/partner/rooms/${roomId}/revenue-analytics`),

  triggerTraining: (roomId) =>
    partnerFetch(`/api/partner/rooms/${roomId}/train`, { method: "POST" }),

  // ── Reviews ─────────────────────────────────────────────────────────
  getReviews: (params = {}) => {
    const q = new URLSearchParams();
    if (params.hotelId) q.set("hotelId", params.hotelId);
    if (params.rating) q.set("rating", params.rating);
    if (params.hasReply !== undefined && params.hasReply !== "") q.set("hasReply", params.hasReply);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return partnerFetch(`/api/partner/reviews${suffix}`);
  },

  replyReview: (reviewId, reply) =>
    partnerFetch(`/api/partner/reviews/${reviewId}/reply`, {
      method: "PUT",
      body: JSON.stringify({ reply }),
    }),
};
