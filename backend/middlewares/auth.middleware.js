import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ACCESS_TOKEN_SECRET } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Workspace } from '../models/workspace.model.js';

export const protectRoute = async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized access.' });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).populate('teams', 'name').populate('workspace');

    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Unauthorized access.' });
    }

    // Check if user has workspace in database (before toJSON conversion)
    let workspaceId = null;
    
    // First, check the raw user.workspace (could be ObjectId or populated object)
    if (user.workspace) {
      if (user.workspace._id) {
        // Populated object
        workspaceId = user.workspace._id.toString();
      } else if (user.workspace instanceof mongoose.Types.ObjectId || mongoose.Types.ObjectId.isValid(user.workspace)) {
        // Raw ObjectId
        workspaceId = user.workspace.toString();
      }
    }
    
    // If user doesn't have workspace, try to find and assign one
    if (!workspaceId) {
      try {
        // Find first active workspace
        const defaultWorkspace = await Workspace.findOne({ isActive: true }).sort({ createdAt: 1 });
        
        if (defaultWorkspace) {
          // Assign workspace to user
          user.workspace = defaultWorkspace._id;
          await user.save();
          
          workspaceId = defaultWorkspace._id.toString();
          console.log(`Auto-assigned workspace ${workspaceId} to user ${user._id}`);
        } else {
          console.warn(`No workspace found for user ${user._id}. User needs a workspace to use the system.`);
        }
      } catch (error) {
        console.error('Error auto-assigning workspace:', error);
      }
    }
    
    // Now create jsonUser with normalized workspace
    const jsonUser = user.toJSON();
    // Override workspace with normalized value (toJSON might have converted it differently)
    jsonUser.workspace = workspaceId;
    jsonUser.teamNames = user.teams ? user.teams.map((team) => team.name) : [];
    req.user = jsonUser;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired.' });
    }
    return res.status(401).json({ error: 'Unauthorized access.' });
  }
};

// Middleware to check if user has owner-level permissions (admin or manager)
export const ownerRoute = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    return next();
  }
  res.status(403).json({ error: 'Access denied - Admin or Manager only' });
};

// Middleware to check if user is admin
export const adminRoute = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Access denied - Admin only' });
};

// Middleware to check if user is manager
export const managerRoute = (req, res, next) => {
  if (req.user && req.user.role === 'manager') {
    return next();
  }
  res.status(403).json({ error: 'Access denied - Manager only' });
};
