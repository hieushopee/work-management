import { create } from 'zustand';
import axios from '../libs/axios';
import { toast } from 'react-hot-toast';

export const useSalaryStore = create((set) => ({
  salaries: [],
  salary: null,
  loading: false,
  actionLoading: false,

  // Get all salaries
  getAllSalaries: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/salaries');
      set({ salaries: res.data.salaries || [], loading: false });
    } catch (error) {
      console.error('Error fetching salaries:', error);
      set({ salaries: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch salaries');
    }
  },

  // Get salary by user ID
  getSalaryByUserId: async (userId) => {
    set({ loading: true });
    try {
      const res = await axios.get(`/salaries/${userId}`);
      set({ salary: res.data.salary, loading: false });
      return res.data.salary;
    } catch (error) {
      console.error('Error fetching salary:', error);
      set({ salary: null, loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch salary');
      throw error;
    }
  },

  // Update salary
  updateSalary: async (userId, { baseSalary, currency, reason }) => {
    set({ actionLoading: true });
    try {
      const res = await axios.put(`/salaries/${userId}`, {
        baseSalary,
        currency,
        reason,
      });
      toast.success('Salary updated successfully');
      set({ actionLoading: false });
      return res.data.salary;
    } catch (error) {
      console.error('Error updating salary:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to update salary');
      throw error;
    }
  },

  // Create adjustment request
  createAdjustmentRequest: async (userId, { type, amount, reason, description }) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post(`/salaries/${userId}/adjustment-requests`, {
        type,
        amount,
        reason,
        description,
      });
      toast.success('Adjustment request created successfully');
      set({ actionLoading: false });
      return res.data.salary;
    } catch (error) {
      console.error('Error creating adjustment request:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to create adjustment request');
      throw error;
    }
  },

  // Review adjustment request
  reviewAdjustmentRequest: async (userId, requestId, { status, reviewNote }) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post(`/salaries/${userId}/adjustment-requests/${requestId}/review`, {
        status,
        reviewNote,
      });
      toast.success(`Request ${status} successfully`);
      set({ actionLoading: false });
      return res.data.salary;
    } catch (error) {
      console.error('Error reviewing adjustment request:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to review request');
      throw error;
    }
  },

  // Clear salary
  clearSalary: () => {
    set({ salary: null });
  },

  // Payroll functions
  payrolls: [],
  payroll: null,

  // Get payrolls
  getPayrolls: async (params = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams(params).toString();
      const res = await axios.get(`/salaries/payrolls/list${queryParams ? `?${queryParams}` : ''}`);
      set({ payrolls: res.data.payrolls || [], loading: false });
      return res.data.payrolls || [];
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      set({ payrolls: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch payrolls');
      throw error;
    }
  },

  // Get payroll by user ID
  getPayrollByUserId: async (userId, period) => {
    set({ loading: true });
    try {
      const queryParams = period ? `?period=${period}` : '';
      const res = await axios.get(`/salaries/payrolls/${userId}${queryParams}`);
      set({ payroll: res.data.payrolls, loading: false });
      return res.data.payrolls;
    } catch (error) {
      console.error('Error fetching payroll:', error);
      set({ payroll: null, loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch payroll');
      throw error;
    }
  },

  // Create or update payroll
  upsertPayroll: async (data) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post('/salaries/payrolls', data);
      toast.success('Payroll saved successfully');
      set({ actionLoading: false });
      return res.data.payroll;
    } catch (error) {
      console.error('Error saving payroll:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to save payroll');
      throw error;
    }
  },

  // Approve payroll
  approvePayroll: async (payrollId) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post(`/salaries/payrolls/${payrollId}/approve`);
      toast.success('Payroll approved successfully');
      set({ actionLoading: false });
      return res.data.payroll;
    } catch (error) {
      console.error('Error approving payroll:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to approve payroll');
      throw error;
    }
  },

  // Lock payroll
  lockPayroll: async (payrollId) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post(`/salaries/payrolls/${payrollId}/lock`);
      toast.success('Payroll locked successfully');
      set({ actionLoading: false });
      return res.data.payroll;
    } catch (error) {
      console.error('Error locking payroll:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to lock payroll');
      throw error;
    }
  },

  // Export payrolls to Excel
  exportPayrollsToExcel: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`/salaries/payrolls/export/excel${queryParams ? `?${queryParams}` : ''}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `payroll_${params.period || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Payroll exported successfully');
    } catch (error) {
      console.error('Error exporting payrolls:', error);
      toast.error(error.response?.data?.error || 'Failed to export payrolls');
      throw error;
    }
  },

  // Import payrolls from Excel
  importPayrollsFromExcel: async (file) => {
    set({ actionLoading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post('/salaries/payrolls/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success(res.data.message || 'Payrolls imported successfully');
      set({ actionLoading: false });
      return res.data;
    } catch (error) {
      console.error('Error importing payrolls:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to import payrolls');
      throw error;
    }
  },

  // Get daily salary statistics for Staff
  dailyStats: [],
  getDailySalaryStats: async (userId, startDate, endDate) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`/salaries/stats/daily/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      set({ dailyStats: res.data.stats || [], loading: false });
      return res.data;
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      set({ dailyStats: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch daily statistics');
      throw error;
    }
  },
}));

export default useSalaryStore;

