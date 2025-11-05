// File: src/stores/useUserStore.js
import { create } from "zustand";
import axios from "../libs/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  createAccessCode: async ({ email }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/create-new-access-code", { email });
      if (res.data.success) {
        toast.success("✅ Mã truy cập đã được gửi qua email", { duration: 5000 });
        return res.data;
      }
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Lỗi khi tạo mã truy cập");
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  validateAccessCode: async ({ email, accessCode }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/validate-access-code", {
        email,
        accessCode,
      });
      if (res.data.success) {
        set({ user: res.data.user });
        return res.data;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Mã truy cập không hợp lệ");
    } finally {
      set({ loading: false });
    }
  },

  editProfile: async ({ name, email, phoneNumber, department, role, avatar }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/edit", {
        name,
        email,
        phoneNumber,
        department,
        role,
        avatar,
      });
      if (res.data.success) {
        set({
          user: res.data.user,
        });
        toast.success(res.data.message || "✅ Cập nhật thành công");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Không thể cập nhật hồ sơ");
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const res = await axios.get("/auth/profile");
      let user = res.data.user;

      // 👇 Bổ sung faceUrl/avatar nếu thiếu
      if (user && (!user.faceUrl || !user.avatar)) {
        try {
          const empRes = await axios.get(`/employees/${user.id}`);
          const employee = empRes.data?.employee;
          if (employee) {
            user = {
              ...user,
              ...employee,
              avatar: employee.avatar || user.avatar || null,
              faceUrl: employee.faceUrl || user.faceUrl || null,
            };
          }
        } catch {
          console.warn("⚠️ Không thể lấy thông tin bổ sung từ employees");
        }
      }
      set({ user });
    } catch {
      set({ user: null });
    } finally {
      set({ checkingAuth: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await axios.post("/auth/logout");
      localStorage.removeItem("isSidebarHidden");
      set({ user: null });
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Đăng xuất thất bại");
    } finally {
      set({ loading: false });
    }
  },

  refreshToken: async () => {
    try {
      const res = await axios.post("/auth/refresh-token");
      return res.data;
    } catch (error) {
      set({ user: null });
      throw error;
    } finally {
      set({ checkingAuth: false });
    }
  },

  // API đồng bộ lịch trình
  syncSchedules: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/schedules");
      if (res.data.success) {
        set({ schedules: res.data.schedules });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Không thể đồng bộ lịch trình");
    } finally {
      set({ loading: false });
    }
  },

  createSchedule: async (scheduleData) => {
    set({ loading: true });
    try {
      const res = await axios.post("/schedules", scheduleData);
      if (res.data.success) {
        toast.success("✅ Tạo lịch trình thành công");
        useUserStore.getState().syncSchedules();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "❌ Không thể tạo lịch trình");
    } finally {
      set({ loading: false });
    }
  },

  // 👇 Hàm gọi API điểm danh
  markAttendance: async (eventId, status) => {
    try {
      const res = await axios.put(`/calendar/${eventId}/attendance`, { status });
      toast.success(
        status === "success" ? "✅ Điểm danh thành công" : "❌ Điểm danh thất bại"
      );
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "❌ Không thể cập nhật điểm danh");
      throw error;
    }
  },
}));

// Axios interceptor để tự động refresh token
let refreshPromise = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (refreshPromise) {
          await refreshPromise;
        } else {
          refreshPromise = useUserStore.getState().refreshToken();
          await refreshPromise;
          refreshPromise = null;
        }

        return axios(originalRequest);
      } catch (refreshError) {
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default useUserStore;







