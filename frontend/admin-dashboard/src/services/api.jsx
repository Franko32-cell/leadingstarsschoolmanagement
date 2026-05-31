import axios from "axios";

const BASE_URL = "https://school-backend-bzk3.onrender.com/api";

const PUBLIC_ENDPOINTS = ["/auth/login/", "/auth/refresh/", "/auth/register/"];

// ── Axios instance ─────────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,   // ← removed trailing slash
  timeout: 30000,
});

// ── Request interceptor — attach JWT ──────────────────────────
API.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((path) => config.url?.includes(path));
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
      originalRequest.url?.includes(path)
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
