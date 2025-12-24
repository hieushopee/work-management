import { Document } from '../models/document.model.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { toObjectId } from '../utils/identifiers.js';

// Note: these handlers are placeholder implementations so the UI doesn't spin indefinitely.
// Replace with real data and persistence when integrating document features.

export const getAllDocuments = async (req, res) => {
  try {
    const { user } = req;
    const { category, docType, approvalStatus } = req.query;
    const workspaceId = toObjectId(user.workspace);
    const query = {
      workspace: workspaceId,
      isActive: true,
    };

    // Role-based access control
    if (user.role === 'member') {
      // Members can see company-wide documents, their department's documents, and their own personal documents.
      query.$or = [
        { visibility: 'company', docType: 'company' },
        { department: user.department, visibility: 'department', docType: 'company' },
        { createdBy: toObjectId(user.id), docType: 'personal' },
      ];
      // By default, members only see approved company documents
      if (!docType || docType === 'company') {
        query.approvalStatus = 'approved';
      }
    } else if (user.role === 'manager') {
      // Managers can see all documents from their department and below, plus company-wide docs.
      const managedDepartmentIds = user.managedDepartments || [];
      const departmentIds = [user.department, ...managedDepartmentIds].filter(Boolean);

      query.$or = [
        { visibility: 'company', docType: 'company' },
        { department: { $in: departmentIds } },
        { createdBy: toObjectId(user.id), docType: 'personal' },
      ];
    }
    // Admins and Super Admins can see all documents, so no extra query constraints are needed.

    // Additional filters from query parameters
    if (category) {
      query.category = category;
    }
    if (docType) {
      query.docType = docType;
      // If a member is fetching their personal docs, they can see all statuses
      if (user.role === 'member' && docType === 'personal') {
        delete query.approvalStatus;
      }
    }
    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .populate('department', 'name')
      .populate('submittedBy', 'username')
      .populate('approvedBy', 'username');

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }

    const document = await Document.findById(id);

    if (!document || !document.isActive) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Authorization check
    const isSuperAdminOrAdmin = user.role === 'super_admin' || user.role === 'admin';
    const isCreator = document.createdBy.equals(toObjectId(user.id));

    if (isSuperAdminOrAdmin) {
      // Admins can see everything
    } else if (document.docType === 'personal') {
      // For personal documents, only the creator can see it.
      if (!isCreator) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    } else {
      // For company documents
      if (document.visibility === 'company') {
        // All workspace members can see company-wide documents
      } else if (document.visibility === 'department') {
        const isManagerOfDepartment =
          user.role === 'manager' &&
          (user.managedDepartments?.some((dept) => dept.equals(document.department)) ||
            user.department?.equals(document.department));

        if (!isManagerOfDepartment && !user.department?.equals(document.department)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    // Populate details for the response
    await document.populate([
      { path: 'department', select: 'name' },
      { path: 'submittedBy', select: 'username email' },
      { path: 'approvedBy', select: 'username email' },
      { path: 'createdBy', select: 'username email' },
    ]);

    res.json({ success: true, document });
  } catch (error) {
    console.error('Error fetching document by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createDocument = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, category, department, visibility, tags, docType } = req.body;
  const { user } = req;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Document file is required' });
  }

  const workspaceId = toObjectId(user.workspace);
  if (!workspaceId) {
    console.error('Create document - Missing workspace:', {
      userId: user.id,
      workspace: user.workspace,
      workspaceType: typeof user.workspace,
    });
    return res.status(400).json({ 
      success: false, 
      message: 'User workspace is required. Please contact administrator.' 
    });
  }

  const createdById = toObjectId(user.id);
  if (!createdById) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid user ID' 
    });
  }

  try {
    const newDocument = new Document({
      title,
      description,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      category,
      department: department || null,
      visibility,
      createdBy: createdById,
      workspace: workspaceId,
      tags: tags ? JSON.parse(tags) : [],
      docType: docType || 'company',
      approvalStatus: 'approved', // Admin-created documents are pre-approved
      approvedBy: createdById,
      approvedAt: new Date(),
    });

    await newDocument.save();

    res.status(201).json({ success: true, document: newDocument });
  } catch (error) {
    console.error('Error creating document:', error);
    // Cleanup uploaded file on error
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error cleaning up file:', err);
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitDocument = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, category, tags } = req.body;
  const { user } = req;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Document file is required' });
  }

  const workspaceId = toObjectId(user.workspace);
  if (!workspaceId) {
    console.error('Create document - Missing workspace:', {
      userId: user.id,
      workspace: user.workspace,
      workspaceType: typeof user.workspace,
    });
    return res.status(400).json({ 
      success: false, 
      message: 'User workspace is required. Please contact administrator.' 
    });
  }

  const userId = toObjectId(user.id);
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid user ID' 
    });
  }

  try {
    const newDocument = new Document({
      title,
      description,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      category,
      department: user.department || null,
      visibility: 'department', // Personal submissions are department-level by default
      createdBy: userId,
      workspace: workspaceId,
      tags: tags ? JSON.parse(tags) : [],
      docType: 'personal',
      approvalStatus: 'pending',
      submittedBy: userId,
    });

    await newDocument.save();

    res.status(201).json({ success: true, document: newDocument });
  } catch (error) {
    console.error('Error submitting document:', error);
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error cleaning up file:', err);
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, department, visibility, tags, isActive } = req.body;
  const { user } = req;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID' });
  }

  try {
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Authorization: only admin or creator can update
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isCreator = document.createdBy.equals(toObjectId(user.id));

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Prepare updates
    const updates = {
      title,
      description,
      category,
      department,
      visibility,
      isActive,
      tags: tags ? JSON.parse(tags) : document.tags,
    };

    // Handle file replacement
    if (req.file) {
      // Delete old file
      if (document.file?.path) {
        fs.unlink(document.file.path, (err) => {
          if (err) console.error('Error cleaning up old file:', err);
        });
      }
      updates.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
      };
    }

    // Filter out undefined fields so they don't overwrite existing data
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updatedDocument = await Document.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error cleaning up new file on failure:', err);
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID' });
  }

  try {
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Authorization: only admins can "delete"
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Soft delete
    document.isActive = false;
    await document.save();

    res.json({ success: true, message: 'Document deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating document:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDocumentStatistics = async (req, res) => {
  try {
    const { user } = req;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    const query = {
      workspace: toObjectId(user.workspace),
      isActive: true,
    };

    // Non-admins only see stats for documents they have access to
    if (!isAdmin) {
      const managedDepartmentIds = user.managedDepartments || [];
      const departmentIds = [user.department, ...managedDepartmentIds].filter(Boolean);

      query.$or = [
        { visibility: 'company', approvalStatus: 'approved' },
        { department: { $in: departmentIds }, approvalStatus: 'approved' },
        { createdBy: toObjectId(user.id) },
      ];
    }

    const totalDocuments = await Document.countDocuments(query);

    const byCategory = await Document.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ]);

    const byVisibility = await Document.aggregate([
      { $match: query },
      { $group: { _id: '$visibility', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ]);

    const recentDocuments = await Document.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');

    res.json({
      success: true,
      statistics: {
        totalDocuments,
        byCategory,
        byVisibility,
        recentDocuments,
      },
    });
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }

    const document = await Document.findById(id);

    if (!document || !document.isActive) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Reuse the same authorization logic from getDocumentById to ensure security
    const isSuperAdminOrAdmin = user.role === 'super_admin' || user.role === 'admin';
    const isCreator = document.createdBy.equals(toObjectId(user.id));

    let isAuthorized = false;
    if (isSuperAdminOrAdmin) {
      isAuthorized = true;
    } else if (document.docType === 'personal') {
      if (isCreator) isAuthorized = true;
    } else {
      if (document.visibility === 'company') {
        isAuthorized = true;
      } else if (document.visibility === 'department') {
        const isManagerOfDepartment =
          user.role === 'manager' &&
          (user.managedDepartments?.some((dept) => dept.equals(document.department)) ||
            user.department?.equals(document.department));
        if (isManagerOfDepartment || user.department?.equals(document.department)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const filePath = document.file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.download(filePath, document.file.originalName, (err) => {
      if (err) {
        console.error('Error during file download:', err);
        // Avoid sending another response if headers are already sent
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not download the file' });
        }
      }
    });
  } catch (error) {
    console.error('Error preparing document download:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

export const previewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }

    const document = await Document.findById(id);

    if (!document || !document.isActive) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Reuse the same authorization logic from getDocumentById
    const isSuperAdminOrAdmin = user.role === 'super_admin' || user.role === 'admin';
    const isCreator = document.createdBy.equals(toObjectId(user.id));

    let isAuthorized = false;
    if (isSuperAdminOrAdmin) {
      isAuthorized = true;
    } else if (document.docType === 'personal') {
      if (isCreator) isAuthorized = true;
    } else {
      if (document.visibility === 'company') {
        isAuthorized = true;
      } else if (document.visibility === 'department') {
        const isManagerOfDepartment =
          user.role === 'manager' &&
          (user.managedDepartments?.some((dept) => dept.equals(document.department)) ||
            user.department?.equals(document.department));
        if (isManagerOfDepartment || user.department?.equals(document.department)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const filePath = document.file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.setHeader('Content-Type', document.file.mimeType);
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error during file preview:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not preview the file' });
        }
      }
    });
  } catch (error) {
    console.error('Error preparing document preview:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

export const reviewDocument = async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // 'approved' or 'rejected'
  const { user } = req;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid document ID' });
  }

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const document = await Document.findById(id);

    if (!document || document.approvalStatus !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Document not found or not pending review',
      });
    }

    // Authorization: Manager of the department, admin, or super_admin
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isManagerOfDepartment =
      user.role === 'manager' &&
      (user.managedDepartments?.some((dept) => dept.equals(document.department)) ||
        user.department?.equals(document.department));

    if (!isAdmin && !isManagerOfDepartment) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    document.approvalStatus = status;
    document.approvedBy = toObjectId(user.id);
    document.approvedAt = new Date();
    if (status === 'rejected') {
      document.rejectionReason = rejectionReason || 'No reason provided';
    } else {
      document.rejectionReason = '';
    }

    await document.save();
    res.json({ success: true, document });
  } catch (error) {
    console.error('Error reviewing document:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
