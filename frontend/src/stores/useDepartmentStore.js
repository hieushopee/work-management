import { create } from 'zustand';
import axios from '../libs/axios';

const useDepartmentStore = create((set) => ({
  departments: [],
  loading: false,
  actionLoading: false,

  getAllDepartments: async () => {
    set({ loading: true });
    try {
      const { data } = await axios.get('/departments');
      set({ departments: Array.isArray(data) ? data : [] });
      return { success: true };
    } catch (err) {
      const status = err?.response?.status;
      // If not authenticated, fail silently but clear data so UI doesn't break
      if (status === 401) {
        set({ departments: [] });
        return { success: false, unauthorized: true };
      }
      console.error('Error fetching departments:', err);
      set({ departments: [] });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  createDepartment: async (payload) => {
    set({ actionLoading: true });
    try {
      const { data } = await axios.post('/departments', payload);
      set((state) => ({ departments: [data, ...(state.departments || [])] }));
      return data;
    } catch (err) {
      console.error('Error creating department:', err);
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  updateDepartment: async (id, payload) => {
    set({ actionLoading: true });
    try {
      const { data } = await axios.put(`/departments/${id}`, payload);
      set((state) => ({
        departments: (state.departments || []).map((d) => (String(d._id || d.id) === String(id) ? data : d)),
      }));
      return data;
    } catch (err) {
      console.error('Error updating department:', err);
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  deleteDepartment: async (id) => {
    set({ actionLoading: true });
    try {
      await axios.delete(`/departments/${id}`);
      set((state) => ({
        departments: (state.departments || []).filter((d) => String(d._id || d.id) !== String(id)),
      }));
    } catch (err) {
      console.error('Error deleting department:', err);
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },
}));

export default useDepartmentStore;
