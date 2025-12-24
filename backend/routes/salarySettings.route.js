import express from 'express';
import {
  getSalarySettings,
  updateSalarySettings,
  getAllProposals,
  createProposal,
  reviewProposal,
  getAllReports,
  createReport,
  reviewReport,
  getCompanySalaries,
  getDepartmentSalaries,
} from '../controllers/salarySettings.controller.js';
import { protectRoute, adminRoute, managerRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============ SALARY SETTINGS ============
router.get('/settings', protectRoute, getSalarySettings);
router.put('/settings', protectRoute, adminRoute, updateSalarySettings);

// ============ MANAGER PROPOSALS ============
router.get('/proposals', protectRoute, getAllProposals);
router.post('/proposals', protectRoute, managerRoute, createProposal);
router.put('/proposals/:proposalId/review', protectRoute, adminRoute, reviewProposal);

// ============ STAFF REPORTS ============
router.get('/reports', protectRoute, getAllReports);
router.post('/reports', protectRoute, createReport);
router.put('/reports/:reportId/review', protectRoute, reviewReport);

// ============ VIEW SALARIES ============
router.get('/company', protectRoute, adminRoute, getCompanySalaries);
router.get('/department', protectRoute, managerRoute, getDepartmentSalaries);

export default router;

