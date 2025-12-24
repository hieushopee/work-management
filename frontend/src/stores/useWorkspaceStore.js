import { create } from 'zustand';
import axios from '../libs/axios';
import { toast } from 'react-hot-toast';

export const useWorkspaceStore = create((set) => ({
  workspace: null,
  loading: false,

  checkWorkspace: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/workspace/check');
      return res.data;
    } catch (error) {
      console.error('Error checking workspace:', error);
      return { exists: false, needsWorkspace: true };
    } finally {
      set({ loading: false });
    }
  },

  checkWorkspaceAdmin: async (workspaceId) => {
    set({ loading: true });
    try {
      const res = await axios.get('/workspace/check-admin', {
        params: { workspaceId },
      });
      return res.data;
    } catch (error) {
      console.error('Error checking workspace admin:', error);
      return { hasAdmin: false, needsAdmin: true };
    } finally {
      set({ loading: false });
    }
  },

  getCurrentWorkspace: async () => {
    const savedWorkspaceId = localStorage.getItem('workspaceId');
    const savedWorkspaceName = localStorage.getItem('workspaceName');
    const isValidWorkspaceId = savedWorkspaceId && /^[0-9a-fA-F]{24}$/.test(savedWorkspaceId);

    // If we have a valid saved workspace, try to fetch fresh data by id
    if (isValidWorkspaceId) {
      set({ loading: true });
      try {
        const res = await axios.get(`/workspace/${savedWorkspaceId}`);
        if (res.data?.workspace || res.data?.name) {
          const workspace = res.data.workspace || { id: savedWorkspaceId, name: res.data.name };
          set({ workspace, loading: false });
          localStorage.setItem('workspaceId', workspace.id || savedWorkspaceId);
          if (workspace.name) localStorage.setItem('workspaceName', workspace.name);
          return workspace;
        }
      } catch {
        // Ignore errors and fall back to saved values
      } finally {
        set({ loading: false });
      }

      // Fallback to saved workspace if API failed
      if (savedWorkspaceName) {
        const fallback = { id: savedWorkspaceId, name: savedWorkspaceName };
        set({ workspace: fallback });
        return fallback;
      }
    }

    // No valid saved workspace, clear any leftovers and return null
    localStorage.removeItem('workspaceId');
    localStorage.removeItem('workspaceName');
    set({ workspace: null });
    return null;
  },

  setWorkspace: (workspace) => {
    set({ workspace });
    if (workspace) {
      localStorage.setItem('workspaceId', workspace.id);
      localStorage.setItem('workspaceName', workspace.name);
    }
  },
}));
