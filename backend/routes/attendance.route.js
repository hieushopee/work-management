import express from 'express';
import { protectRoute } from '../middlewares/auth.middleware.js';
import {
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  validateShift,
  upsertAssignments,
  listAssignments,
  validateAssignments,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  validateLocation,
  listDeviceRequests,
  createDeviceRequest,
  updateDeviceRequestStatus,
  listLogs,
  checkin,
  checkout,
  validateCheckin,
  getRules,
  updateRules,
  validateRules,
  listForms,
  createForm,
  updateFormStatus,
  sendLogNotification,
} from '../controllers/attendance.controller.js';

const router = express.Router();

// Shifts
router.get('/shifts', protectRoute, listShifts);
router.post('/shifts', protectRoute, validateShift, createShift);
router.put('/shifts/:id', protectRoute, validateShift, updateShift);
router.delete('/shifts/:id', protectRoute, deleteShift);

// Assignments
router.get('/assignments', protectRoute, listAssignments);
router.post('/assignments/bulk', protectRoute, validateAssignments, upsertAssignments);

// Locations
router.get('/locations', protectRoute, listLocations);
router.post('/locations', protectRoute, validateLocation, createLocation);
router.put('/locations/:id', protectRoute, validateLocation, updateLocation);
router.delete('/locations/:id', protectRoute, deleteLocation);

// Device requests
router.get('/devices', protectRoute, listDeviceRequests);
router.post('/devices', protectRoute, createDeviceRequest);
router.patch('/devices/:id/status', protectRoute, updateDeviceRequestStatus);

// Rules
router.get('/rules', protectRoute, getRules);
router.put('/rules', protectRoute, validateRules, updateRules);

// Logs (history + checkin/checkout)
router.get('/logs', protectRoute, listLogs);
router.post('/logs/checkin', protectRoute, validateCheckin, checkin);
router.post('/logs/checkout', protectRoute, validateCheckin, checkout);
router.post('/logs/notification', protectRoute, sendLogNotification);

// Forms (leave requests, etc.)
router.get('/forms', protectRoute, listForms);
router.post('/forms', protectRoute, createForm);
router.patch('/forms/:id/status', protectRoute, updateFormStatus);

export default router;
