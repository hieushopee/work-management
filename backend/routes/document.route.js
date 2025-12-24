import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protectRoute, adminRoute } from '../middlewares/auth.middleware.js';
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  submitDocument,
  updateDocument,
  deleteDocument,
  getDocumentStatistics,
  downloadDocument,
  previewDocument,
  reviewDocument,
} from '../controllers/document.controller.js';

const router = express.Router();

// Create upload directory if it doesn't exist
const documentUploadDir = path.join(process.cwd(), 'backend', 'uploads', 'documents');
fs.mkdirSync(documentUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentUploadDir);
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
    fileSize: 50 * 1024 * 1024, // 50MB per file
  },
  fileFilter: (_req, file, cb) => {
    // Allow all file types
    cb(null, true);
  },
});

// Get document statistics (Admin only) - Must be before /:id route
router.get('/statistics', protectRoute, getDocumentStatistics);

// Get all documents (with role-based filtering)
router.get('/', protectRoute, getAllDocuments);

// Download document file - Must be before /:id route
router.get('/:id/download', protectRoute, downloadDocument);
// Preview document inline
router.get('/:id/preview', protectRoute, previewDocument);

// Get document by ID - Must be last
router.get('/:id', protectRoute, getDocumentById);

// Create document (Admin only)
router.post('/', protectRoute, adminRoute, upload.single('file'), createDocument);
router.post('/submit', protectRoute, upload.single('file'), submitDocument);

// Update document (Admin only)
router.put('/:id', protectRoute, adminRoute, upload.single('file'), updateDocument);
router.post('/:id/review', protectRoute, reviewDocument);

// Delete document (Admin only)
router.delete('/:id', protectRoute, adminRoute, deleteDocument);

export default router;
