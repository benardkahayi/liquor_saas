import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getCurrentSubdomain } from "../lib/tenantHost";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

// Auth now travels as httpOnly cookies set by the backend (see
// backend/src/common/utils/authCookies.ts) rather than in-memory JS
// variables — a subdomain redirect after login is a different browser
// origin, and in-memory state can't survive that. withCredentials makes
// axios send/receive those cookies; nothing in this file touches the
// token values directly anymore.
export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

// Every request says which tenant subdomain the browser is currently on.
// The backend never trusts this for identity — it's cross-checked against
// the authenticated user's JWT (middleware/tenant.ts) and rejected on
// mismatch. This header only lets that check happen at all, since this
// backend is a single origin with no subdomains of its own.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const slug = getCurrentSubdomain();
  if (slug) {
    config.headers["X-Tenant-Slug"] = slug;
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

async function performRefresh(): Promise<void> {
  await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
}

// The auth endpoints' own 401s (wrong password, no session cookie yet,
// expired refresh token) are meaningful responses the caller already
// handles — they must never trigger ANOTHER refresh-then-retry attempt.
// Skipping them here is what stops that turning into a loop.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => originalRequest?.url?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch {
        // No valid session — reject and let the caller decide what to do.
        // AuthContext's mount check just sets user to null; ProtectedRoute
        // then redirects reactively via react-router. A hard reload here
        // (the old behavior) re-mounts the whole app and re-runs this
        // exact check, which for a visitor with no session at all becomes
        // an infinite reload loop.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
