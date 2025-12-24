import { Router } from "express"
import { ownerRoute, protectRoute, adminRoute } from "../middlewares/auth.middleware.js";
import {
  addChecklistItem,
  addTaskComment,
  changeTaskStatus,
  createTask,
  deleteChecklistItem,
  deleteTaskById,
  deleteTaskComment,
  getAllTasks,
  getTasksByUserId,
  togglePinTask,
  updateChecklistItem,
  updateTaskById,
  updateTaskComment,
  sendUrgentNotification,
} from "../controllers/task.controller.js";

const router = Router();

router.get('/', protectRoute, ownerRoute, getAllTasks)
router.get('/:id', protectRoute, getTasksByUserId)
router.post('/create', protectRoute, ownerRoute, createTask)
router.post('/create/:id', protectRoute, ownerRoute, createTask)
router.post('/:id', protectRoute, ownerRoute, updateTaskById)
router.post('/:id/status', protectRoute, changeTaskStatus)
router.post('/:id/pin', protectRoute, togglePinTask)
router.post('/:id/comments', protectRoute, addTaskComment)
router.patch('/:id/comments/:commentId', protectRoute, updateTaskComment)
router.delete('/:id/comments/:commentId', protectRoute, deleteTaskComment)
router.post('/:id/checklist', protectRoute, addChecklistItem)
router.patch('/:id/checklist/:itemId', protectRoute, updateChecklistItem)
router.delete('/:id/checklist/:itemId', protectRoute, deleteChecklistItem)
router.delete('/:id', protectRoute, ownerRoute, deleteTaskById)
router.post('/notifications/send-urgent', protectRoute, adminRoute, sendUrgentNotification)

export default router;
