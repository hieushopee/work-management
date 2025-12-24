// File: src/stores/useUserStore.js
import { create } from "zustand";
import axios from "../libs/axios";
import { toast } from "react-hot-toast";

const fetchWorkspaceName = async (workspaceId) => {
  const id = workspaceId ? String(workspaceId) : '';
  const isValidWorkspaceId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidWorkspaceId) return null;
  try {
    const workspaceRes = await axios.get(`/workspace/${id}`);
    const name = workspaceRes.data?.workspace?.name || workspaceRes.data?.name;
    if (name) {
      localStorage.setItem('workspaceId', id);
      localStorage.setItem('workspaceName', name);
      return name;
    }
  } catch {
    // ignore
  }
  return null;
};

export const useUserStore = create((set) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  createAccessCode: async ({ email, workspaceId }) => {
    set({ loading: true });
    try {
      // IMPORTANT: Don't send workspaceId from localStorage or store
      // Backend will find user by email and use their workspace
      // Only send workspaceId if explicitly provided (e.g., from URL parameter when registering)
      const res = await axios.post("/auth/create-new-access-code", { 
        email, 
        workspaceId: workspaceId || undefined // Only send if explicitly provided
      });
      if (res.data.success) {
        toast.success("Access code has been sent to your email", { duration: 5000 });
        return res.data;
      }
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.error || "Error creating access code");
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  validateAccessCode: async ({ email, accessCode, workspaceId }) => {
    set({ loading: true });
    try {
      // IMPORTANT: Only use workspaceId if explicitly provided
      // Do NOT use localStorage as fallback to prevent workspace confusion
      const res = await axios.post("/auth/validate-access-code", {
        email,
        accessCode,
        workspaceId,
      });
      if (res.data.success) {
        const user = res.data.user;
        set({ user });
        
        // After successful validation, save workspaceId from user object
        if (user?.workspace) {
          localStorage.setItem('workspaceId', user.workspace);
          await fetchWorkspaceName(user.workspace);
        }
        
        return res.data;
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Invalid access code");
    } finally {
      set({ loading: false });
    }
  },

  registerAdmin: async ({ workspaceId, email, password, name, phoneNumber }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/register-admin", {
        workspaceId,
        email,
        password,
        name,
        phoneNumber,
      });
      if (res.data.success) {
        const user = res.data.user;
        set({ user });
        
        // After successful registration, save workspaceId from user object
        if (user?.workspace) {
          localStorage.setItem('workspaceId', user.workspace);
          await fetchWorkspaceName(user.workspace);
        }
        
        toast.success("Admin account registered successfully!");
        return res.data;
      }
      return { success: false };
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Error during registration";
      const errorDetails = error.response?.data?.details;
      if (errorDetails && Array.isArray(errorDetails)) {
        toast.error(`${errorMessage}: ${errorDetails.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  login: async ({ email, password, workspaceId }) => {
    set({ loading: true });
    try {
      console.log('🔐 Frontend: Starting login for:', email);
      
      // IMPORTANT: Login page should NOT send workspaceId
      // Backend will find user by email and return their workspace
      // Only send workspaceId if explicitly provided (e.g., from URL parameter)
      const res = await axios.post("/auth/login", { 
        email, 
        password, 
        workspaceId: workspaceId || undefined // Only send if explicitly provided
      });
      
      console.log('✅ Frontend: Login response received:', res.data);
      
      if (res.data.success) {
        const user = res.data.user;
        console.log('👤 Frontend: User data:', user);
        set({ user });
        
        // After successful login, save workspaceId from user object
        // This ensures we always use the correct workspace that user belongs to
        if (user?.workspace) {
          localStorage.setItem('workspaceId', user.workspace);
          console.log('💾 Frontend: Saved workspaceId to localStorage:', user.workspace);
          
          const name = await fetchWorkspaceName(user.workspace);
          if (name) {
            console.log('💾 Frontend: Saved workspaceName to localStorage:', name);
          }
        } else {
          console.warn('⚠️ Frontend: User has no workspace assigned');
        }
        
        toast.success("Login successful");
        return res.data;
      }
      
      console.log('❌ Frontend: Login failed - no success in response');
      return { success: false };
    } catch (error) {
      console.error('❌ Frontend: Login error:', error);
      console.error('❌ Frontend: Error response:', error.response?.data);
      console.error('❌ Frontend: Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.error || error.message || "Invalid email or password";
      toast.error(errorMessage);
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  forgotPassword: async ({ email }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/forgot-password", { email });
      if (res.data.success) {
        toast.success("Password reset code has been sent to your email");
        return res.data;
      }
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.error || "Error sending password reset code");
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  verifyResetCode: async ({ email, resetCode }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/verify-reset-code", { email, resetCode });
      if (res.data.success) {
        return res.data;
      }
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.error || "Invalid reset code");
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async ({ email, resetCode, newPassword }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/reset-password", { email, resetCode, newPassword });
      if (res.data.success) {
        toast.success("Password reset successfully");
        return res.data;
      }
      return { success: false };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Error resetting password";
      const details = error.response?.data?.details;
      if (details && Array.isArray(details)) {
        toast.error(`${errorMsg}: ${details.join(', ')}`);
      } else {
        toast.error(errorMsg);
      }
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/change-password", { currentPassword, newPassword });
      if (res.data.success) {
        toast.success("Password changed successfully");
        return res.data;
      }
      return { success: false };
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Error changing password";
      const details = error.response?.data?.details;
      if (details && Array.isArray(details)) {
        toast.error(`${errorMsg}: ${details.join(', ')}`);
      } else {
        toast.error(errorMsg);
      }
      return { success: false };
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
        toast.success(res.data.message || "Update successful");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to update profile");
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const fetchProfile = async () => {
        const res = await axios.get("/auth/profile");
        return res.data.user;
      };

      let user = null;
      try {
        user = await fetchProfile();
      } catch (err) {
        // If token expired, try refresh then call again
        if (err?.response?.status === 401) {
          try {
            await axios.post("/auth/refresh-token");
            user = await fetchProfile();
          } catch {
            user = null;
          }
        } else {
          throw err;
        }
      }

      if (!user) {
        set({ user: null });
        return;
      }

      // 👇 Add faceUrl/avatar if missing
      if (!user.faceUrl || !user.avatar) {
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
          console.warn("⚠️ Unable to fetch additional info from employees");
        }
      }

      set({ user });
      
      // CRITICAL: Always use workspaceId from user object, not from localStorage
      // This ensures workspace isolation - each user belongs to only one workspace
      if (user?.workspace) {
        const workspaceId = String(user.workspace);
        const isValidWorkspaceId = /^[0-9a-fA-F]{24}$/.test(workspaceId);
        
        if (isValidWorkspaceId) {
          // Update localStorage with workspaceId from user object
          localStorage.setItem('workspaceId', workspaceId);
          
          await fetchWorkspaceName(workspaceId);
        } else {
          // Invalid workspace ID format - clear localStorage to prevent confusion
          localStorage.removeItem('workspaceId');
          localStorage.removeItem('workspaceName');
        }
      } else {
        // User has no workspace - clear localStorage
        localStorage.removeItem('workspaceId');
        localStorage.removeItem('workspaceName');
      }
    } catch (error) {
      // 401 is expected when user is not logged in - don't log as error
      if (error.response?.status !== 401) {
        console.error('Error checking auth:', error);
      }
      set({ user: null });
    } finally {
      set({ checkingAuth: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await axios.post("/auth/logout");
      // Clear all workspace-related data from localStorage
      localStorage.removeItem("isSidebarHidden");
      localStorage.removeItem("workspaceId");
      localStorage.removeItem("workspaceName");
      set({ user: null });
    } catch (error) {
      toast.error(error.response?.data?.error || "Logout failed");
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

  // Sync schedules API
  syncSchedules: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/schedules");
      if (res.data.success) {
        set({ schedules: res.data.schedules });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to sync schedules");
    } finally {
      set({ loading: false });
    }
  },

  createSchedule: async (scheduleData) => {
    set({ loading: true });
    try {
      const res = await axios.post("/schedules", scheduleData);
      if (res.data.success) {
        toast.success("Schedule created successfully");
        useUserStore.getState().syncSchedules();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to create schedule");
    } finally {
      set({ loading: false });
    }
  },

  // 👇 Mark attendance API function
  markAttendance: async (eventId, status) => {
    try {
      const res = await axios.put(`/calendar/${eventId}/attendance`, { status });
      toast.success(
        status === "success" ? "Attendance marked successfully" : "Attendance marking failed"
      );
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update attendance");
      throw error;
    }
  },
}));

// Axios interceptor to auto refresh token
let refreshPromise = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only skip refresh for the refresh-token endpoint itself to avoid loops
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh-token');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
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
        // Only logout if refresh fails and we have a user
        const currentUser = useUserStore.getState().user;
        if (currentUser) {
          useUserStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default useUserStore;


