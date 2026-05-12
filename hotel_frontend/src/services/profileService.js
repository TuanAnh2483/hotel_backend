import { getToken } from "./authService";
import { buildApiUrl } from "../config/apiConfig";

async function profileFetch(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, body, ...restOptions } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(buildApiUrl(path), {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body,
    ...restOptions,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || `HTTP ${res.status}`);
  }
  return json.data ?? json;
}

export const profileService = {
  getProfile: () => profileFetch("/api/me/profile"),

  updateProfile: (data) =>
    profileFetch("/api/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return profileFetch("/api/me/profile/avatar", {
      method: "POST",
      body: formData,
    });
  },

  getBilling: () => profileFetch("/api/me/billing"),

  getNotifications: () => profileFetch("/api/me/notifications"),

  markNotificationRead: (notificationId) =>
    profileFetch(`/api/me/notifications/${notificationId}/read`, {
      method: "POST",
    }),

  updatePreferences: (data) =>
    profileFetch("/api/me/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  changePassword: (data) =>
    profileFetch("/api/me/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
