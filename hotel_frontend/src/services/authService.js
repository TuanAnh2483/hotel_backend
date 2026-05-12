

import { buildApiUrl } from "../config/apiConfig";
async function request(path, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(buildApiUrl(path), {
    headers: { "Content-Type": "application/json", ...extraHeaders },
    ...restOptions,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.message || `HTTP ${res.status}`);
  return json.data ?? json;
}

// ── Token / session helpers ──────────────────────────────────────
export function getToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("user")); }
  catch { return null; }
}

export function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function setStoredUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function authedRequest(path, options = {}) {
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

// ── Auth API calls ───────────────────────────────────────────────
export const authService = {
  // Returns AuthResponse: { accessToken, tokenType, expiresIn, user: { id, email, userType, status } }
  login({ email, password }) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Backend only accepts: email, password, confirmPassword
  register({ email, password, confirmPassword }) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, confirmPassword }),
    });
  },

  forgotPassword({ email }) {
    return request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword({ token, newPassword, confirmPassword }) {
    return request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
  },

  verifyEmail({ token }) {
    return request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  resendVerification({ email }) {
    return request("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  getCurrentUser() {
    return authedRequest("/api/me");
  },

  logout() {
    const token = getToken();
    return request("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).finally(clearSession);
  },
};
