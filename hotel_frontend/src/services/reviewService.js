
import { getToken } from "./authService";
import { buildApiUrl } from "../config/apiConfig";


async function apiFetch(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(buildApiUrl(path), {
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

export const reviewService = {
  async getHotelReviews(hotelId) {
    try {
      const data = await apiFetch(`/api/hotels/${hotelId}/reviews`);
      const list = Array.isArray(data) ? data : [];
      return list.map((review) => ({
        id: review.reviewId,
        bookingId: review.bookingId,
        hotelId: review.hotelId,
        rating: review.rating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        partnerReply: review.partnerReply,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        partnerRepliedAt: review.partnerRepliedAt,
      }));
    } catch { return []; }
  },

  async getMyReviews() {
    try {
      const data = await apiFetch("/api/reviews/me");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createReview({ bookingId, rating, comment }) {
    return apiFetch("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ bookingId, rating, comment }),
    });
  },

  async updateReview(reviewId, { rating, comment }) {
    return apiFetch(`/api/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify({ rating, comment }),
    });
  },

  async deleteReview(reviewId) {
    return apiFetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
  },
};
