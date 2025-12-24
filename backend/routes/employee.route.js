import { Router } from "express"
import { createEmployee, deleteEmployeeById, getAllEmployees, getAllUsers, getAllUsersForMessaging, getEmployeeById, updateEmployeeById, uploadEmployeeFace, resetEmployeePassword, toggleEmployeeLock } from "../controllers/employee.controller.js";
import { ownerRoute, protectRoute, adminRoute } from "../middlewares/auth.middleware.js";

const router = Router();

router.post('/create', protectRoute, ownerRoute, createEmployee)
router.get('/all', protectRoute, getAllUsers)
router.get('/all-for-messaging', protectRoute, getAllUsersForMessaging)
router.get('/', protectRoute, getAllEmployees)
router.get('/:id', protectRoute, getEmployeeById)
router.post('/:id', protectRoute, ownerRoute, updateEmployeeById)
router.post('/:id/face', protectRoute, ownerRoute, uploadEmployeeFace)
router.post('/:id/reset-password', protectRoute, adminRoute, resetEmployeePassword)
router.post('/:id/toggle-lock', protectRoute, adminRoute, toggleEmployeeLock)
router.delete('/:id', protectRoute, ownerRoute, deleteEmployeeById)

export default router;