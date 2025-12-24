import { create } from 'zustand';
import axios from '../libs/axios';
import { toast } from 'react-hot-toast';

export const usePermissionStore = create((set) => ({
  permissions: [],
  myPermissions: null,
  loading: false,
  actionLoading: false,

  // Get all permissions
  getAllPermissions: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/permissions');
      set({ permissions: res.data.permissions || [], loading: false });
      return res.data.permissions || [];
    } catch (error) {
      console.error('Error fetching permissions:', error);
      set({ permissions: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch permissions');
      throw error;
    }
  },

  // Get permission by target
  getPermissionByTarget: async (targetType, targetId) => {
    set({ loading: true });
    try {
      const res = await axios.get(`/permissions/${targetType}/${targetId}`);
      set({ loading: false });
      return res.data.permission;
    } catch (error) {
      console.error('Error fetching permission:', error);
      set({ loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch permission');
      throw error;
    }
  },

  // Get my permissions
  getMyPermissions: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/permissions/my');
      set({ myPermissions: res.data.permissions || null, loading: false });
      return res.data.permissions || null;
    } catch (error) {
      console.error('Error fetching my permissions:', error);
      set({ myPermissions: null, loading: false });
      throw error;
    }
  },

  // Create or update permission
  upsertPermission: async (targetType, targetId, modules) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post('/permissions', {
        targetType,
        targetId,
        modules,
      });
      toast.success('Permission saved successfully');
      set({ actionLoading: false });
      return res.data.permission;
    } catch (error) {
      console.error('Error saving permission:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to save permission');
      throw error;
    }
  },

  // Update permission
  updatePermission: async (targetType, targetId, modules) => {
    set({ actionLoading: true });
    try {
      const res = await axios.put(`/permissions/${targetType}/${targetId}`, {
        modules,
      });
      toast.success('Permission updated successfully');
      set({ actionLoading: false });
      return res.data.permission;
    } catch (error) {
      console.error('Error updating permission:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to update permission');
      throw error;
    }
  },

  // Delete permission
  deletePermission: async (id) => {
    set({ actionLoading: true });
    try {
      await axios.delete(`/permissions/${id}`);
      toast.success('Permission deleted successfully');
      set({ actionLoading: false });
    } catch (error) {
      console.error('Error deleting permission:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to delete permission');
      throw error;
    }
  },
}));


