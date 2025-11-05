import { Router } from "express"
import { createNewAccessCode, editProfile, getProfile, logout, refreshAccessToken, validateAccessCode } from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { getCurrentUser } from '../controllers/auth.controller.js'

const router = Router();

router.post("/create-new-access-code", createNewAccessCode);
router.post("/validate-access-code", validateAccessCode);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.get("/profile", protectRoute, getProfile);
router.post("/edit", protectRoute, editProfile);
router.get('/me', protectRoute, getCurrentUser);

export default router;