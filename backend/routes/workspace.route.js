import { Router } from "express";
import { createWorkspace, getWorkspace, getCurrentWorkspace, checkWorkspace, checkWorkspaceAdmin, updateWorkspace } from "../controllers/workspace.controller.js";
import { protectRoute, adminRoute } from "../middlewares/auth.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'workspaces');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Public routes
router.post("/create", createWorkspace);
router.get("/check", checkWorkspace);
router.get("/check-admin", checkWorkspaceAdmin);
router.get("/", getWorkspace); // Must be before /:id to handle query params
// Protected routes should come before the catch-all /:id to avoid treating "current" as an ID
router.get("/current", protectRoute, getCurrentWorkspace);
router.put("/update", protectRoute, adminRoute, upload.single('logo'), updateWorkspace);
router.get("/:id", getWorkspace); // Get workspace by ID (must be last)

export default router;
