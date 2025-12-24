import { Permission } from '../models/permission.model.js';
import { User } from '../models/user.model.js';
import { Department } from '../models/department.model.js';
import { toObjectId } from '../utils/identifiers.js';
import mongoose from 'mongoose';

// Get all permissions
export const getAllPermissions = async (req, res) => {
  try {
    const { user } = req;
    const workspaceId = toObjectId(user.workspace);

    const permissions = await Permission.find({ workspace: workspaceId })
      .populate('targetId', 'name email department')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

// Get permission by target (user or department)
export const getPermissionByTarget = async (req, res) => {
  try {
    const { user } = req;
    const { targetType, targetId } = req.params;
    const workspaceId = toObjectId(user.workspace);

    if (!['user', 'department'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    const permission = await Permission.findOne({
      workspace: workspaceId,
      targetType,
      targetId: toObjectId(targetId),
    });

    if (!permission) {
      return res.json({ permission: null });
    }

    res.json({ permission });
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ error: 'Failed to fetch permission' });
  }
};

// Create or update permission
export const upsertPermission = async (req, res) => {
  try {
    const { user } = req;
    const { targetType, targetId, modules } = req.body;
    const workspaceId = toObjectId(user.workspace);

    if (!['user', 'department'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    // Verify target exists
    if (targetType === 'user') {
      const targetUser = await User.findById(targetId);
      if (!targetUser || targetUser.workspace?.toString() !== workspaceId.toString()) {
        return res.status(404).json({ error: 'User not found' });
      }
    } else if (targetType === 'department') {
      const targetDept = await Department.findById(targetId);
      if (!targetDept || targetDept.workspace?.toString() !== workspaceId.toString()) {
        return res.status(404).json({ error: 'Department not found' });
      }
    }

    const permission = await Permission.findOneAndUpdate(
      {
        workspace: workspaceId,
        targetType,
        targetId: toObjectId(targetId),
      },
      {
        workspace: workspaceId,
        targetType,
        targetId: toObjectId(targetId),
        modules: modules || {},
        createdBy: toObjectId(user.id),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('targetId', 'name email department')
      .populate('createdBy', 'name email');

    res.json({ permission });
  } catch (error) {
    console.error('Error upserting permission:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Permission already exists for this target' });
    }
    res.status(500).json({ error: 'Failed to save permission' });
  }
};

// Delete permission
export const deletePermission = async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const workspaceId = toObjectId(user.workspace);

    const permission = await Permission.findOneAndDelete({
      _id: toObjectId(id),
      workspace: workspaceId,
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
};

// Get permissions for current user (combining user and department permissions)
export const getMyPermissions = async (req, res) => {
  try {
    const { user } = req;
    const workspaceId = toObjectId(user.workspace);

    // Get user-specific permissions
    const userPermission = await Permission.findOne({
      workspace: workspaceId,
      targetType: 'user',
      targetId: toObjectId(user.id),
    });

    // Get department-specific permissions
    let departmentPermission = null;
    if (user.department) {
      departmentPermission = await Permission.findOne({
        workspace: workspaceId,
        targetType: 'department',
        targetId: toObjectId(user.department),
      });
    }

    // Check if any permissions exist and have at least one true value
    const hasUserPermissions = userPermission && userPermission.modules && 
      Object.values(userPermission.modules).some(modulePerms => 
        modulePerms && typeof modulePerms === 'object' && 
        Object.values(modulePerms).some(val => val === true)
      );
    
    const hasDeptPermissions = departmentPermission && departmentPermission.modules && 
      Object.values(departmentPermission.modules).some(modulePerms => 
        modulePerms && typeof modulePerms === 'object' && 
        Object.values(modulePerms).some(val => val === true)
      );
    
    // If no permissions are set at all (or all are false), return null to allow default access
    if (!hasUserPermissions && !hasDeptPermissions) {
      return res.json({ permissions: null });
    }

    // Merge permissions (user permissions override department permissions)
    const mergedPermissions = {
      tasks: { create: false, read: false, update: false, delete: false, manage: false },
      forms: { create: false, read: false, update: false, delete: false, manage: false },
      calendar: { create: false, read: false, update: false, delete: false, manage: false },
      messages: { create: false, read: false, update: false, delete: false, manage: false },
      documents: { create: false, read: false, update: false, delete: false, manage: false },
      attendance: { create: false, read: false, update: false, delete: false, manage: false },
      salary: { create: false, read: false, update: false, delete: false, manage: false },
      employees: { create: false, read: false, update: false, delete: false, manage: false },
    };

    // Apply department permissions first
    if (departmentPermission && departmentPermission.modules) {
      Object.keys(mergedPermissions).forEach((module) => {
        if (departmentPermission.modules[module]) {
          Object.keys(mergedPermissions[module]).forEach((action) => {
            mergedPermissions[module][action] = departmentPermission.modules[module][action] || false;
          });
        }
      });
    }

    // Override with user permissions
    if (userPermission && userPermission.modules) {
      Object.keys(mergedPermissions).forEach((module) => {
        if (userPermission.modules[module]) {
          Object.keys(mergedPermissions[module]).forEach((action) => {
            mergedPermissions[module][action] = userPermission.modules[module][action] || mergedPermissions[module][action];
          });
        }
      });
    }

    // Check if any permission is actually true (not all false)
    const hasAnyTruePermission = Object.values(mergedPermissions).some(modulePerms => 
      modulePerms && typeof modulePerms === 'object' && 
      Object.values(modulePerms).some(val => val === true)
    );

    // If all permissions are false, return null to allow default access
    if (!hasAnyTruePermission) {
      return res.json({ permissions: null });
    }

    res.json({ permissions: mergedPermissions });
  } catch (error) {
    console.error('Error fetching my permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};


