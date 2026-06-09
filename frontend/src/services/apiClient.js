import axios from "axios";
import { getToken, getRefreshToken, setTokens, clearSession } from "./authStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token + handle FormData ───────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// ── Token refresh state (shared across all concurrent requests) ───────────────
let isRefreshing = false;
let pendingQueue = []; // [{ resolve, reject }]

function drainQueue(error, newToken) {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  pendingQueue = [];
}

function normalizeError(error) {
  const status = error.response?.status;
  const body = error.response?.data;
  const message =
    body?.error?.message || body?.message || `HTTP ${status ?? "unknown"}`;
  const err = new Error(message);
  err.status = status;
  err.details = body?.error?.details || [];
  return err;
}

// ── Response interceptor: unwrap envelope + silent token refresh on 401 ───────
apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Chỉ thử refresh khi: 401 + chưa retry + không phải auth endpoint
    const isAuthEndpoint = originalRequest.url?.includes("/api/auth/");
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // Có request khác đang refresh → xếp hàng chờ
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          pendingQueue.push({ resolve, reject })
        ).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearSession();
        window.dispatchEvent(new Event("auth:session-expired"));
        throw normalizeError(error);
      }

      try {
        // Gọi thẳng axios (bypass interceptor) để tránh vòng lặp
        const { data: raw } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );
        // Bóc envelope { data: { accessToken, refreshToken, ... } }
        const payload = raw?.data ?? raw;
        const newAccessToken = payload.accessToken;
        const newRefreshToken = payload.refreshToken;

        setTokens(newAccessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        drainQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        drainQueue(refreshError, null);
        clearSession();
        window.dispatchEvent(new Event("auth:session-expired"));
        throw normalizeError(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    throw normalizeError(error);
  }
);

export default apiClient;
