// File: backend/routes/form.route.js
import express from 'express';
import {
  createForm,
  getForms,
  getFormById,
  deleteForm,
  voteOption,
  addOptionToForm,
  deleteOptionFromForm,
  updateFormOptions,
} from '../controllers/form.controller.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', protectRoute, createForm);
router.get('/', protectRoute, getForms);
router.get('/:formId', protectRoute, getFormById);
router.delete('/:formId', protectRoute, deleteForm);

router.post('/:formId/options', protectRoute, addOptionToForm);
router.delete('/:formId/options/:optionId', protectRoute, deleteOptionFromForm);
router.put('/:formId/options', protectRoute, updateFormOptions);
router.post('/:formId/options/:optionId/vote', protectRoute, voteOption);

export default router;
