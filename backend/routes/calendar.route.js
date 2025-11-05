// backend/routes/calendar.routes.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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
router.get('/', getEvents);

// Tạo mới sự kiện
router.post('/', upload.array('reportFiles', 10), createEvent);

// Cập nhật sự kiện
router.put('/:id', upload.array('reportFiles', 10), updateEvent);

// Xoá sự kiện
router.delete('/:id', deleteEvent);

// ✅ Điểm danh (attendance) -> dùng POST
router.post('/attendance/:id', markAttendance);

// Shift tracking
router.post('/:id/shift/start', startShift);
router.post('/:id/shift/end', endShift);

export default router;
