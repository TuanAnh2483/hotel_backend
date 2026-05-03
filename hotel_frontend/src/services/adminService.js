import { getToken } from "./authService";

async function adminFetch(path, options = {}) {
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

// ── Service exports ─────────────────────────────────────────────────

export const adminService = {
  // Dashboard
  async getStats() {
    try {
      const data = await adminFetch("/api/admin/stats");
      return {
        totalUsers: data.totalUsers ?? data.customerCount ?? 0,
        totalPartners: data.totalPartners ?? data.partnerCount ?? 0,
        totalHotels: data.totalHotels ?? data.hotelCount ?? 0,
        totalBookings: data.totalBookings ?? data.bookingCount ?? 0,
        pendingBookings: data.pendingBookings ?? data.pendingPaymentCount ?? 0,
      };
    } catch { return { totalUsers: 0, totalPartners: 0, totalHotels: 0, totalBookings: 0, pendingBookings: 0 }; }
  },

  // Partner applications — real API
  getPartnerApplications(status) {
    const q = status ? `?status=${status}` : "";
    return adminFetch(`/api/admin/partner-applications${q}`);
  },
  approvePartner(applicationId) {
    return adminFetch(`/api/admin/partner-applications/${applicationId}/approve`, { method: "POST" });
  },
  rejectPartner(applicationId, reason) {
    return adminFetch(`/api/admin/partner-applications/${applicationId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // Users — real API
  async getUsers(search = "") {
    try {
      const data = await adminFetch("/api/admin/users");
      const list = Array.isArray(data) ? data : [];
      const q = search.toLowerCase();
      return q ? list.filter(u => u.email.toLowerCase().includes(q)) : list;
    } catch { return []; }
  },
  async toggleUserStatus(userId) {
    return adminFetch(`/api/admin/users/${userId}/toggle-status`, { method: "POST" });
  },
  async createUser({ email, password, userType }) {
    return adminFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, userType }),
    });
  },

  // Hotels — real API
  async getHotels() {
    try {
      const data = await adminFetch("/api/admin/hotels");
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  async updateHotel(hotelId, data) {
    return adminFetch(`/api/admin/hotels/${hotelId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteHotel(hotelId) {
    return adminFetch(`/api/admin/hotels/${hotelId}`, { method: "DELETE" });
  },

  // Bookings — real API
  async getBookings(status = "") {
    try {
      const data = await adminFetch("/api/admin/bookings");
      const list = Array.isArray(data) ? data : [];
      return status ? list.filter(b => b.status === status) : list;
    } catch { return []; }
  },

  // Refunds — real API
  getRefunds: async (status = "") => {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const data = await adminFetch(`/api/admin/refunds${q}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  updateRefundStatus: async (refundId, newStatus) => {
    if (newStatus === "APPROVED") {
      return adminFetch(`/api/admin/refunds/${refundId}/approve`, { method: "POST" });
    }
    if (newStatus === "REJECTED") {
      return adminFetch(`/api/admin/refunds/${refundId}/reject`, { method: "POST" });
    }
    throw new Error("Unsupported refund status");
  },

  // Reviews — real API
  async getReviews() {
    try {
      const data = await adminFetch("/api/admin/reviews");
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  async deleteReview(reviewId) {
    return adminFetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
  },

  // System — real API
  getSystemData: async () => {
    try {
      const data = await adminFetch("/api/admin/system");
      return {
        flaggedBookings: Array.isArray(data?.flaggedBookings)
          ? data.flaggedBookings.map((item) => ({
              ...item,
              reason: item.reason || item.message || "Cần kiểm tra",
              reportedAt: item.reportedAt || item.requestedAt || "—",
            }))
          : [],
        recentErrors: Array.isArray(data?.recentErrors)
          ? data.recentErrors.map((item) => ({
              ...item,
              timestamp: item.timestamp || item.createdAt || "—",
            }))
          : [],
      };
    } catch {
      return { flaggedBookings: [], recentErrors: [] };
    }
  },
  resolveFlaggedBooking: async (flagId) => {
    return { id: flagId };
  },
};
