import axios from "axios";

const serializeParams = (params) => {
  const searchParams = new URLSearchParams();
  if (!params) {
    return searchParams.toString();
  }

  const appendValue = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => appendValue(key, item));
      return;
    }
    const normalized = value instanceof Date ? value.toISOString() : String(value);
    searchParams.append(key, normalized);
  };

  Object.entries(params).forEach(([key, value]) => appendValue(key, value));
  return searchParams.toString();
};

// In development, use relative path to leverage Vite proxy
// This ensures cookies work correctly across localhost:3000 (frontend) and localhost:5000 (backend)
const axiosInstance = axios.create({
  baseURL: "/api", // Always use relative path to go through Vite proxy in dev
  withCredentials: true,
  paramsSerializer: serializeParams,
});

// Suppress 401 errors for auth endpoints (expected when user is not logged in)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress console errors for 401 on auth/profile endpoint
    if (error.config?.url?.includes('/auth/profile') && error.response?.status === 401) {
      // Don't log this error - it's expected when user is not logged in
      return Promise.reject(error);
    }
    // For other errors, let them through normally
    return Promise.reject(error);
  }
);

export default axiosInstance;

// === API tiện ích ===
export const markAttendance = async (eventId, success) => {
  try {
    const res = await axiosInstance.post(`/calendar/attendance/${eventId}`, { success });
    return res.data;
  } catch (err) {
    console.error("[API] markAttendance error:", err);
    throw err;
  }
};

export const startShift = async (eventId, userId) => {
  try {
    const res = await axiosInstance.post(`/calendar/${eventId}/shift/start`, { userId });
    return res.data;
  } catch (err) {
    console.error("[API] startShift error:", err);
    throw err;
  }
};

export const endShift = async (eventId, userId) => {
  try {
    const res = await axiosInstance.post(`/calendar/${eventId}/shift/end`, { userId });
    return res.data;
  } catch (err) {
    console.error("[API] endShift error:", err);
    throw err;
  }
};
