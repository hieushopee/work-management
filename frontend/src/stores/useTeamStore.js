import { create } from 'zustand';
import axios from '../libs/axios';

const useTeamStore = create((set, get) => ({
  teams: [],
  loading: false,
  actionLoading: false,

  // Get all teams
  getAllTeams: async () => {
    set({ loading: true });
    try {
      const response = await axios.get('/teams');
      set({ teams: response.data || [] });
    } catch (error) {
      console.error('Error fetching teams:', error);
      set({ teams: [] });
    } finally {
      set({ loading: false });
    }
  },

  // Create new team
  createTeam: async (teamData) => {
    set({ actionLoading: true });
    try {
      console.log('🔍 Frontend - Creating team with data:', teamData);
      const response = await axios.post('/teams', teamData);
      const newTeam = response.data;
      console.log('✅ Frontend - Team created successfully:', newTeam);
      
      set((state) => ({
        teams: [newTeam, ...state.teams],
        actionLoading: false
      }));
      
      return newTeam;
    } catch (error) {
      console.error('❌ Frontend - Error creating team:', error);
      console.error('❌ Frontend - Error response:', error.response?.data);
      set({ actionLoading: false });
      throw error;
    }
  },

  // Update team
  updateTeam: async ({ id, ...teamData }) => {
    set({ actionLoading: true });
    try {
      const response = await axios.put(`/teams/${id}`, teamData);
      const updatedTeam = response.data;
      
      set((state) => ({
        teams: state.teams.map(team => 
          team.id === id ? updatedTeam : team
        ),
        actionLoading: false
      }));
      
      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      set({ actionLoading: false });
      throw error;
    }
  },

  // Delete team
  deleteTeam: async (id) => {
    set({ actionLoading: true });
    try {
      await axios.delete(`/teams/${id}`);
      
      set((state) => ({
        teams: state.teams.filter(team => team.id !== id),
        actionLoading: false
      }));
    } catch (error) {
      console.error('Error deleting team:', error);
      set({ actionLoading: false });
      throw error;
    }
  },

  // Add member to team
  addMemberToTeam: async (teamId, userId) => {
    set({ actionLoading: true });
    try {
      const response = await axios.post(`/teams/${teamId}/members`, { userId });
      const updatedTeam = response.data;
      
      set((state) => ({
        teams: state.teams.map(team => 
          team.id === teamId ? updatedTeam : team
        ),
        actionLoading: false
      }));
      
      return updatedTeam;
    } catch (error) {
      console.error('Error adding member to team:', error);
      set({ actionLoading: false });
      throw error;
    }
  },

  // Remove member from team
  removeMemberFromTeam: async (teamId, userId) => {
    set({ actionLoading: true });
    try {
      const response = await axios.delete(`/teams/${teamId}/members`, { 
        data: { userId } 
      });
      const updatedTeam = response.data;
      
      set((state) => ({
        teams: state.teams.map(team => 
          team.id === teamId ? updatedTeam : team
        ),
        actionLoading: false
      }));
      
      return updatedTeam;
    } catch (error) {
      console.error('Error removing member from team:', error);
      set({ actionLoading: false });
      throw error;
    }
  },

  // Get team by ID
  getTeamById: (id) => {
    const { teams } = get();
    return teams.find(team => team.id === id);
  },

  // Clear teams
  clearTeams: () => {
    set({ teams: [] });
  }
}));

export default useTeamStore;

