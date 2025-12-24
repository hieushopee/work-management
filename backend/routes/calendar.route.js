import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { protectRoute } from '../middlewares/auth.middleware.js';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  markAttendance,
  startShift,
  endShift,
} from '../controllers/calendar.controller.js';

const router = express.Router();

const calendarUploadDir = path.join(process.cwd(), 'backend', 'uploads', 'calendar');
fs.mkdirSync(calendarUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, calendarUploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname) || '';
    cb(null, `${unique}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    fieldSize: 25 * 1024 * 1024, // allow larger text fields (e.g., base64 images)
  },
});

// Lấy danh sách sự kiện
router.get('/', protectRoute, getEvents);

// Tạo mới sự kiện
router.post('/', protectRoute, upload.array('reportFiles', 10), createEvent);

// Cập nhật sự kiện
router.put('/:id', protectRoute, upload.array('reportFiles', 10), updateEvent);

// Xoá sự kiện
router.delete('/:id', protectRoute, deleteEvent);

// ✅ Điểm danh (attendance) -> dùng POST
router.post('/attendance/:id', protectRoute, markAttendance);

// Shift tracking
router.post('/:id/shift/start', protectRoute, startShift);
router.post('/:id/shift/end', protectRoute, endShift);

export default router;
