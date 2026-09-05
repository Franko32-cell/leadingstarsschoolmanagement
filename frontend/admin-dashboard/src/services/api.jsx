import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL + "/api";

const PUBLIC_ENDPOINTS = ["/auth/login/", "/auth/refresh/", "/auth/register/"];

// Helper: derive pathname from config url (works with absolute or relative URLs)
const getPathname = (url) => {
  try {
    // new URL(relative, base) works for both absolute and relative URLs
    return new URL(url, BASE_URL).pathname;
  } catch {
    return url || "";
  }
};

// ── Axios instance ─────────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,   
  timeout: 30000,
});

// ── Request interceptor — attach JWT ──────────────────────────
API.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((path) => getPathname(config.url).startsWith(path));
  if (!isPublic) {
    const token = localStorage.getItem("access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — auto refresh token ─────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isPublic = PUBLIC_ENDPOINTS.some((path) =>
      getPathname(originalRequest.url).startsWith(path)
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublic
    ) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) {
          window.location.href = "/login";
          return Promise.reject(error);
        }
        const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return API(originalRequest);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ── Wake-up ping — call this once on app load ─────────────────
// Uses a GET-safe endpoint instead of the login endpoint
export const wakeUpServer = () => {
  axios
    .get(`${BASE_URL}/health/`, { timeout: 60000 })
    .catch(() => {});
};

export default API;
