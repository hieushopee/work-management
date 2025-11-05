import { Router } from "express"
import { ownerRoute, protectRoute } from "../middlewares/auth.middleware.js";
import { changeTaskStatus, createTask, deleteTaskById, getAllTasks, getTasksByUserId, updateTaskById, togglePinTask } from "../controllers/task.controller.js";

const router = Router();

router.get('/', protectRoute, ownerRoute, getAllTasks)
router.get('/:id', protectRoute, getTasksByUserId)
router.post('/create/:id', protectRoute, ownerRoute, createTask)
router.post('/:id', protectRoute, ownerRoute, updateTaskById)
router.post('/:id/status', protectRoute, changeTaskStatus)
router.post('/:id/pin', protectRoute, togglePinTask)
router.delete('/:id', protectRoute, ownerRoute, deleteTaskById)

export default router;