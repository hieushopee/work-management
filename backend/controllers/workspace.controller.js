import { Workspace } from '../models/workspace.model.js';
import { User } from '../models/user.model.js';

// Create workspace
export const createWorkspace = async (req, res) => {
  try {
    const { name, domain, subdomain } = req.body;
    
    console.log('Creating workspace with data:', { name, domain, subdomain });

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    // Check if workspace already exists (only if domain/subdomain provided)
    if (domain || subdomain) {
      const existingWorkspace = await Workspace.findOne({
        $or: [
          ...(domain ? [{ domain: domain.toLowerCase().trim() }] : []),
          ...(subdomain ? [{ subdomain: subdomain.toLowerCase().trim() }] : []),
        ],
      });

      if (existingWorkspace) {
        return res.status(400).json({ error: 'Workspace with this domain or subdomain already exists.' });
      }
    }

    // Create workspace
    const workspaceData = {
      name: name.trim(),
      isActive: true,
    };

    // Only add domain/subdomain if provided
    if (domain && domain.trim()) {
      workspaceData.domain = domain.toLowerCase().trim();
    }
    if (subdomain && subdomain.trim()) {
      workspaceData.subdomain = subdomain.toLowerCase().trim();
    }

    console.log('Workspace data to create:', workspaceData);
    const workspace = await Workspace.create(workspaceData);
    console.log('Workspace created successfully:', workspace.id);

    res.json({ success: true, workspace: workspace.toJSON() });
  } catch (error) {
    console.error('Error in createWorkspace:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      errors: error.errors
    });
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ 
        error: `Workspace with this ${field} already exists.`,
        details: error.message 
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ 
        error: 'Validation error',
        details: errors.length > 0 ? errors : [error.message]
      });
    }
    res.status(500).json({ 
      error: error.message || 'Failed to create workspace',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get workspace by domain/subdomain/ID
export const getWorkspace = async (req, res) => {
  try {
    const { domain, subdomain, id } = req.query;
    const workspaceId = req.params?.id || id; // Support both path param and query param

    let query = {};
    if (workspaceId) {
      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
        return res.status(400).json({ error: 'Invalid workspace ID format.' });
      }
      query._id = workspaceId;
    } else if (domain) {
      query.domain = domain.toLowerCase().trim();
    } else if (subdomain) {
      query.subdomain = subdomain.toLowerCase().trim();
    } else {
      return res.status(400).json({ error: 'Domain, subdomain, or ID is required.' });
    }

    const workspace = await Workspace.findOne(query).populate('admin', 'name email');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    if (!workspace.isActive) {
      return res.status(403).json({ error: 'Workspace is inactive.' });
    }

    res.json({ success: true, workspace: workspace.toJSON() });
  } catch (error) {
    console.error('Error in getWorkspace:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid workspace ID format.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get current workspace (for authenticated users)
export const getCurrentWorkspace = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    
    if (!user.workspace) {
      return res.status(404).json({ error: 'No workspace found for this user.' });
    }

    const workspaceId = user.workspace?._id || user.workspace;

    // Validate workspace ID format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      console.error('Invalid workspace ID format:', workspaceId, 'Type:', typeof user.workspace);
      return res.status(400).json({ error: 'Invalid workspace ID format.' });
    }

    const workspace = await Workspace.findById(workspaceId).populate('admin', 'name email');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    res.json({ success: true, workspace: workspace.toJSON() });
  } catch (error) {
    console.error('Error in getCurrentWorkspace:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid workspace ID format.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Check if workspace exists (public endpoint)
export const checkWorkspace = async (req, res) => {
  try {
    const { domain, subdomain } = req.query;

    let query = {};
    if (domain) {
      query.domain = domain.toLowerCase().trim();
    } else if (subdomain) {
      query.subdomain = subdomain.toLowerCase().trim();
    } else {
      // If no domain/subdomain, check if any workspace exists
      const workspaceCount = await Workspace.countDocuments({ isActive: true });
      return res.json({ exists: workspaceCount > 0, needsWorkspace: workspaceCount === 0 });
    }

    const workspace = await Workspace.findOne(query);
    res.json({ exists: !!workspace && workspace.isActive });
  } catch (error) {
    console.error('Error in checkWorkspace:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check if workspace has admin (public endpoint)
export const checkWorkspaceAdmin = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      // Check if any workspace exists and has admin
      const workspace = await Workspace.findOne({ isActive: true }).populate('admin');
      if (!workspace) {
        return res.json({ hasAdmin: false, needsWorkspace: true });
      }
      return res.json({ hasAdmin: !!workspace.admin, needsAdmin: !workspace.admin });
    }

    const workspace = await Workspace.findById(workspaceId).populate('admin');
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    res.json({ hasAdmin: !!workspace.admin, needsAdmin: !workspace.admin });
  } catch (error) {
    console.error('Error in checkWorkspaceAdmin:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update workspace (admin only)
export const updateWorkspace = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update workspace.' });
    }

    if (!user.workspace) {
      return res.status(404).json({ error: 'No workspace found for this user.' });
    }

    const workspaceId = user.workspace?._id || user.workspace;

    // Validate workspace ID format
    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID format.' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    // Update name if provided
    if (req.body.name && req.body.name.trim()) {
      workspace.name = req.body.name.trim();
    }

    // Handle logo upload
    if (req.file) {
      // Construct the URL path for the uploaded file
      // Assuming files are served from /uploads/workspaces/
      workspace.logo = `/uploads/workspaces/${req.file.filename}`;
    } else if (req.body.removeLogo === 'true') {
      // Remove logo if requested
      if (workspace.logo) {
        // Optionally delete the old file
        const fs = require('fs');
        const path = require('path');
        const oldLogoPath = path.join(process.cwd(), 'backend', workspace.logo);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
      workspace.logo = null;
    }

    await workspace.save();

    const updatedWorkspace = await Workspace.findById(workspaceId).populate('admin', 'name email');

    res.json({ success: true, workspace: updatedWorkspace.toJSON() });
  } catch (error) {
    console.error('Error in updateWorkspace:', error);
    res.status(500).json({ error: error.message || 'Failed to update workspace' });
  }
};

