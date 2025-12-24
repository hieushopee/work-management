import express from 'express';
import { protectRoute } from '../middlewares/auth.middleware.js';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  validateDepartment,
} from '../controllers/department.controller.js';

const router = express.Router();

router.use(protectRoute);
router.get('/', getDepartments);
router.post('/', validateDepartment, createDepartment);
router.put('/:id', validateDepartment, updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
