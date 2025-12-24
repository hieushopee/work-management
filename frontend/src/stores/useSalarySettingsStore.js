import { create } from 'zustand';
import axios from '../libs/axios';
import { toast } from 'react-hot-toast';

export const useSalarySettingsStore = create((set) => ({
  // Salary Settings
  settings: null,
  loading: false,
  actionLoading: false,

  // Get salary settings
  getSalarySettings: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/salary-settings/settings');
      set({ settings: res.data.settings, loading: false });
      return res.data.settings;
    } catch (error) {
      console.error('Error fetching salary settings:', error);
      set({ settings: null, loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch salary settings');
      throw error;
    }
  },

  // Update salary settings (Admin only)
  updateSalarySettings: async (data) => {
    set({ actionLoading: true });
    try {
      const res = await axios.put('/salary-settings/settings', data);
      toast.success('Salary settings updated successfully');
      set({ settings: res.data.settings, actionLoading: false });
      return res.data.settings;
    } catch (error) {
      console.error('Error updating salary settings:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to update salary settings');
      throw error;
    }
  },

  // Manager Proposals
  proposals: [],
  proposal: null,

  // Get all proposals
  getAllProposals: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/salary-settings/proposals');
      set({ proposals: res.data.proposals || [], loading: false });
      return res.data.proposals || [];
    } catch (error) {
      console.error('Error fetching proposals:', error);
      set({ proposals: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch proposals');
      throw error;
    }
  },

  // Create proposal (Manager only)
  createProposal: async (data) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post('/salary-settings/proposals', data);
      toast.success('Proposal created successfully');
      set({ actionLoading: false });
      return res.data.proposal;
    } catch (error) {
      console.error('Error creating proposal:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to create proposal');
      throw error;
    }
  },

  // Review proposal (Admin only)
  reviewProposal: async (proposalId, { status, reviewNote }) => {
    set({ actionLoading: true });
    try {
      const res = await axios.put(`/salary-settings/proposals/${proposalId}/review`, {
        status,
        reviewNote,
      });
      toast.success(`Proposal ${status} successfully`);
      set({ actionLoading: false });
      return res.data.proposal;
    } catch (error) {
      console.error('Error reviewing proposal:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to review proposal');
      throw error;
    }
  },

  // Staff Reports
  reports: [],
  report: null,

  // Get all reports
  getAllReports: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/salary-settings/reports');
      set({ reports: res.data.reports || [], loading: false });
      return res.data.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      set({ reports: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch reports');
      throw error;
    }
  },

  // Create report (Staff only)
  createReport: async (data) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post('/salary-settings/reports', data);
      toast.success('Report created successfully');
      set({ actionLoading: false });
      return res.data.report;
    } catch (error) {
      console.error('Error creating report:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to create report');
      throw error;
    }
  },

  // Review report (Admin/Manager)
  reviewReport: async (reportId, { status, reviewNote, resolutionNote }) => {
    set({ actionLoading: true });
    try {
      const res = await axios.put(`/salary-settings/reports/${reportId}/review`, {
        status,
        reviewNote,
        resolutionNote,
      });
      toast.success(`Report ${status} successfully`);
      set({ actionLoading: false });
      return res.data.report;
    } catch (error) {
      console.error('Error reviewing report:', error);
      set({ actionLoading: false });
      toast.error(error.response?.data?.error || 'Failed to review report');
      throw error;
    }
  },

  // Company Salaries (Admin only)
  companySalaries: [],

  // Get company salaries
  getCompanySalaries: async (period) => {
    set({ loading: true });
    try {
      const queryParams = period ? `?period=${period}` : '';
      const res = await axios.get(`/salary-settings/company${queryParams}`);
      set({ companySalaries: res.data.salaries || [], loading: false });
      return res.data;
    } catch (error) {
      console.error('Error fetching company salaries:', error);
      set({ companySalaries: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch company salaries');
      throw error;
    }
  },

  // Generate payrolls for a period (admin/manager)
  generatePayrolls: async (period) => {
    set({ actionLoading: true });
    try {
      const res = await axios.post('/salary/payrolls/generate', { period });
      toast.success('Payrolls generated successfully');
      return res.data;
    } catch (error) {
      console.error('Error generating payrolls:', error);
      toast.error(error.response?.data?.error || 'Failed to generate payrolls');
      throw error;
    } finally {
      set({ actionLoading: false });
    }
  },

  // Department Salaries (Manager only)
  departmentSalaries: [],

  // Get department salaries
  getDepartmentSalaries: async (period) => {
    set({ loading: true });
    try {
      const queryParams = period ? `?period=${period}` : '';
      const res = await axios.get(`/salary-settings/department${queryParams}`);
      set({ departmentSalaries: res.data.salaries || [], loading: false });
      return res.data;
    } catch (error) {
      console.error('Error fetching department salaries:', error);
      set({ departmentSalaries: [], loading: false });
      toast.error(error.response?.data?.error || 'Failed to fetch department salaries');
      throw error;
    }
  },
}));

export default useSalarySettingsStore;

