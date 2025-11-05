import express from 'express';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addMemberToTeam,
  removeMemberFromTeam,
  validateTeam,
} from '../controllers/team.controller.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protectRoute);

// Get all teams
router.get('/', getTeams);

// Create new team
router.post('/', validateTeam, createTeam);

// Update team
router.put('/:id', validateTeam, updateTeam);

// Delete team
router.delete('/:id', deleteTeam);

// Add member to team
router.post('/:id/members', addMemberToTeam);

// Remove member from team
router.delete('/:id/members', removeMemberFromTeam);

export default router;