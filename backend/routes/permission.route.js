import express from 'express';
import { protectRoute, adminRoute } from '../middlewares/auth.middleware.js';
import {
  getAllPermissions,
  getPermissionByTarget,
  upsertPermission,
  deletePermission,
  getMyPermissions,
} from '../controllers/permission.controller.js';

const router = express.Router();

// Get all permissions (admin only)
router.get('/', protectRoute, adminRoute, getAllPermissions);

// Get my permissions (for current user)
router.get('/my', protectRoute, getMyPermissions);

// Get permission by target
router.get('/:targetType/:targetId', protectRoute, adminRoute, getPermissionByTarget);

// Create or update permission (admin only)
router.post('/', protectRoute, adminRoute, upsertPermission);
router.put('/:targetType/:targetId', protectRoute, adminRoute, upsertPermission);

// Delete permission (admin only)
router.delete('/:id', protectRoute, adminRoute, deletePermission);

export default router;


