import { create } from 'zustand';
import axios from '../libs/axios';
import { toast } from 'react-hot-toast';

const useDocumentStore = create((set) => ({
  documents: [],
  statistics: null,
  loading: false,
  error: null,

  // Get all documents
  getAllDocuments: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.department) params.append('department', filters.department);
      if (filters.visibility) params.append('visibility', filters.visibility);
      if (filters.search) params.append('search', filters.search);

      const res = await axios.get(`/documents?${params.toString()}`);
      if (res.data.success) {
        set({ documents: res.data.documents, loading: false });
        return res.data.documents;
      }
      return [];
    } catch (error) {
      console.error('Error getting documents:', error);
      set({ error: error.response?.data?.error || 'Failed to get documents', loading: false });
      return [];
    }
  },

  // Get document by ID
  getDocumentById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`/documents/${id}`);
      if (res.data.success) {
        set({ loading: false });
        return res.data.document;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      set({ error: error.response?.data?.error || 'Failed to get document', loading: false });
      return null;
    }
  },

  // Create document
  createDocument: async (formData) => {
    set({ loading: true, error: null });
    try {
      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      const res = await axios.post('/documents', formData);
      if (res.data.success) {
        set((state) => ({
          documents: [res.data.document, ...state.documents],
          loading: false,
        }));
        toast.success('Document uploaded successfully');
        return res.data.document;
      }
      return null;
    } catch (error) {
      console.error('Error creating document:', error);
      const errorMsg = error.response?.data?.error || 'Failed to upload document';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      return null;
    }
  },

  // Update document
  updateDocument: async (id, formData) => {
    set({ loading: true, error: null });
    try {
      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      const res = await axios.put(`/documents/${id}`, formData);
      if (res.data.success) {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? res.data.document : doc
          ),
          loading: false,
        }));
        toast.success('Document updated successfully');
        return res.data.document;
      }
      return null;
    } catch (error) {
      console.error('Error updating document:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update document';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      return null;
    }
  },

  // Submit document (staff/manager)
  submitDocument: async (formData) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post('/documents/submit', formData);
      if (res.data.success) {
        toast.success('Document submitted successfully');
        set({ loading: false });
        return res.data.document;
      }
      return null;
    } catch (error) {
      console.error('Error submitting document:', error);
      const errorMsg = error.response?.data?.error || 'Failed to submit document';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      return null;
    }
  },

  // Review document (admin/manager)
  reviewDocument: async (id, status, rejectionReason = '') => {
    set({ actionLoading: true, error: null });
    try {
      const res = await axios.post(`/documents/${id}/review`, { status, rejectionReason });
      if (res.data.success) {
        toast.success(status === 'approved' ? 'Document approved' : 'Document rejected');
        set({ actionLoading: false });
        return res.data.document;
      }
      return null;
    } catch (error) {
      console.error('Error reviewing document:', error);
      const errorMsg = error.response?.data?.error || 'Failed to review document';
      set({ error: errorMsg, actionLoading: false });
      toast.error(errorMsg);
      return null;
    }
  },

  // Delete document
  deleteDocument: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.delete(`/documents/${id}`);
      if (res.data.success) {
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
          loading: false,
        }));
        toast.success('Document deleted successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete document';
      set({ error: errorMsg, loading: false });
      toast.error(errorMsg);
      return false;
    }
  },

  // Get statistics
  getStatistics: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get('/documents/statistics');
      if (res.data.success) {
        set({ statistics: res.data.statistics, loading: false });
        return res.data.statistics;
      }
      return null;
    } catch (error) {
      console.error('Error getting statistics:', error);
      set({ error: error.response?.data?.error || 'Failed to get statistics', loading: false });
      return null;
    }
  },

  // Download document
  downloadDocument: async (id, filename) => {
    try {
      const res = await axios.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
      return false;
    }
  },
}));

export default useDocumentStore;
