import axios from "axios";

const getDevelopmentBaseUrl = () => {
  const explicitUrl = import.meta.env.VITE_API_URL;
  if (explicitUrl) return explicitUrl;

  if (typeof window !== "undefined") {
    const host = window.location.hostname ?? "localhost";
    const port = import.meta.env.VITE_API_PORT ?? "5000";
    return `http://${host}:${port}/api`;
  }

  return "http://localhost:5000/api";
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? getDevelopmentBaseUrl() : "/api",
  withCredentials: true,
});

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
