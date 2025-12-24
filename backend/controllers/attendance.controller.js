import { validationResult, body } from 'express-validator';
import { AttendanceShift } from '../models/attendanceShift.model.js';
import { AttendanceAssignment } from '../models/attendanceAssignment.model.js';
import { AttendanceLocation } from '../models/attendanceLocation.model.js';
import { AttendanceDeviceRequest } from '../models/attendanceDeviceRequest.model.js';
import { AttendanceLog } from '../models/attendanceLog.model.js';
import { AttendanceRule } from '../models/attendanceRule.model.js';
import { AttendanceForm } from '../models/attendanceForm.model.js';
import { toObjectId } from '../utils/identifiers.js';
import mongoose from 'mongoose';
import { Workspace } from '../models/workspace.model.js';
import { User } from '../models/user.model.js';
import { imagekit, isImageKitConfigured } from '../config/imagekit.js';
const { Types } = mongoose;

// Helper functions for role-based access control
const isAdmin = (user) => user?.role?.toLowerCase() === 'admin';
const isManager = (user) => user?.role?.toLowerCase() === 'manager';
const isStaff = (user) => user?.role?.toLowerCase() === 'staff';

const getDepartmentUsersIds = async (department) => {
  if (!department) return [];
  const users = await User.find({ department }).select('_id');
  return users.map(u => u._id);
};

const resolveWorkspaceId = (workspace) => {
  if (!workspace) return null;
  if (workspace._id && Types.ObjectId.isValid(workspace._id)) return new Types.ObjectId(workspace._id);
  if (Types.ObjectId.isValid(workspace)) return new Types.ObjectId(workspace);
  return null;
};

const resolveWorkspaceWithFallback = async (user) => {
  const resolved = resolveWorkspaceId(user?.workspace);
  if (resolved) return resolved;
  // Try find workspace by admin or first available as fallback
  if (user?.id) {
    const owned = await Workspace.findOne({ admin: user.id });
    if (owned) return owned._id;
  }
  const any = await Workspace.findOne();
  return any ? any._id : null;
};

const minuteValue = (str) => {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const CHECKIN_FOLDER = '/CheckIn';
const CHECKOUT_FOLDER = '/CheckOut';

const normalizeNameForFile = (name = '') => {
  const fallback = 'employee';
  const safe = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return safe || fallback;
};

const formatAttendanceTimestamp = (dt = new Date()) => {
  const d = dt instanceof Date ? dt : new Date(dt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hh}-${mm} ${day}-${month}-${year}`;
};

// Parse userIds from query (accept array or comma-separated string)
const parseUserIds = (val) => {
  if (!val) return [];
  const parts = Array.isArray(val) ? val : String(val).split(',');
  return parts
    .map((id) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null))
    .filter(Boolean);
};

async function maybeUploadAttendancePhoto(raw, folder, userName, createdAt = new Date()) {
  if (!raw) return { url: null, raw };
  if (!isImageKitConfigured || !imagekit) return { url: null, raw };

  let filePayload = raw;
  if (!String(filePayload).startsWith('data:')) {
    filePayload = `data:image/jpeg;base64,${filePayload}`;
  }

  const fileName = `${normalizeNameForFile(userName)}-${formatAttendanceTimestamp(createdAt)}.jpg`;
  let safeFolder = folder || '/';
  if (!safeFolder.startsWith('/')) safeFolder = `/${safeFolder}`;
  safeFolder = safeFolder.replace(/\/+/g, '/');

  try {
    const uploaded = await imagekit.upload({
      file: filePayload,
      fileName,
      folder: safeFolder,
      useUniqueFileName: false,
      overwriteFile: true,
    });
    return { url: uploaded?.url || null, raw };
  } catch (err) {
    console.error('ImageKit upload error (attendance photo):', err?.message || err);
    return { url: null, raw };
  }
}

export const validateShift = [
  body('name').trim().notEmpty(),
  body('type').optional().isIn(['day', 'hour']),
  body('start').trim().notEmpty(),
  body('end').trim().notEmpty(),
];

export async function listShifts(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.json([]);
    const shifts = await AttendanceShift.find({ workspace: workspaceId }).sort({ createdAt: -1 });
    res.json(shifts);
  } catch (err) {
    console.error('listShifts error:', err);
    res.status(500).json({ message: 'Error fetching shifts' });
  }
}

export async function createShift(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    // Only admin/manager can create shifts
    if (isStaff(req.user)) {
      return res.status(403).json({ message: 'Access denied. Only admin/manager can create shifts.' });
    }

    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required (user chưa thuộc workspace)' });
    const { name, type = 'day', start, end, departments = [], color = '' } = req.body || {};
    const startMinutes = typeof start === 'number' ? start : minuteValue(start);
    const endMinutes = typeof end === 'number' ? end : minuteValue(end);
    if (startMinutes == null || endMinutes == null) {
      return res.status(400).json({ message: 'Invalid time format' });
    }
    const shift = await AttendanceShift.create({
      workspace: workspaceId,
      name: name.trim(),
      type,
      startMinutes,
      endMinutes,
      departments,
      color,
      createdBy: req.user?.id ? toObjectId(req.user.id) : null,
    });
    res.status(201).json(shift);
  } catch (err) {
    console.error('createShift error:', err);
    res.status(500).json({ message: 'Error creating shift' });
  }
}

export async function updateShift(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { id } = req.params;
    const workspace = req.user?.workspace;
    const shift = await AttendanceShift.findById(id);
    if (!shift || !toObjectId(workspace) || !shift.belongsToWorkspace(workspace)) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    const { name, type, start, end, departments, color } = req.body || {};
    if (name) shift.name = name.trim();
    if (type) shift.type = type;
    if (start) {
      const v = minuteValue(start);
      if (v == null) return res.status(400).json({ message: 'Invalid start time' });
      shift.startMinutes = v;
    }
    if (end) {
      const v = minuteValue(end);
      if (v == null) return res.status(400).json({ message: 'Invalid end time' });
      shift.endMinutes = v;
    }
    if (Array.isArray(departments)) shift.departments = departments;
    if (color !== undefined) shift.color = color;
    await shift.save();
    res.json(shift);
  } catch (err) {
    console.error('updateShift error:', err);
    res.status(500).json({ message: 'Error updating shift' });
  }
}

export async function deleteShift(req, res) {
  try {
    const { id } = req.params;
    const workspace = req.user?.workspace;
    const shift = await AttendanceShift.findById(id);
    if (!shift || !toObjectId(workspace) || !shift.belongsToWorkspace(workspace)) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    await AttendanceShift.findByIdAndDelete(id);
    res.status(204).end();
  } catch (err) {
    console.error('deleteShift error:', err);
    res.status(500).json({ message: 'Error deleting shift' });
  }
}

// Assignments
export const validateAssignments = [
  body('assignments').isArray({ min: 1 }),
  body('assignments.*.user').notEmpty(),
  body('assignments.*.date').notEmpty(),
  body('assignments.*.shift').notEmpty(),
];

export async function upsertAssignments(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const { assignments = [], mode = 'employee' } = req.body || {};
    const results = [];

    for (const item of assignments) {
      const userId = toObjectId(item.user);
      const shiftId = toObjectId(item.shift);
      const dateVal = item.date ? new Date(item.date) : null;
      if (!userId || !shiftId || !dateVal || Number.isNaN(dateVal.getTime())) {
        continue;
      }
      const doc = await AttendanceAssignment.findOneAndUpdate(
        {
          workspace: workspaceId,
          user: userId,
          date: dateVal,
        },
        {
          workspace: workspaceId,
          user: userId,
          date: dateVal,
          shift: shiftId,
          flexible: Boolean(item.flexible),
          mode,
          createdBy: req.user?.id ? toObjectId(req.user.id) : null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(doc);
    }

    res.json({ success: true, count: results.length });
  } catch (err) {
    console.error('upsertAssignments error:', err);
    res.status(500).json({ message: 'Error saving assignments' });
  }
}

export async function listAssignments(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.json([]);
    const { start, end, startDate, endDate } = req.query;
    const requestedUserIds = parseUserIds(req.query.userIds);
    const filter = { workspace: workspaceId };

    // Support both start/end and startDate/endDate
    const rangeStart = start || startDate;
    const rangeEnd = end || endDate;
    if (rangeStart && rangeEnd) {
      filter.date = { $gte: new Date(rangeStart), $lte: new Date(rangeEnd) };
    }

    // Staff: chỉ lấy ca của chính mình
    if (isStaff(req.user)) {
      filter.user = toObjectId(req.user.id);
    } else if (isManager(req.user)) {
      const departmentUserIds = await getDepartmentUsersIds(req.user.department);
      if (!departmentUserIds.length) return res.json([]);
      const deptSet = new Set(departmentUserIds.map((id) => id.toString()));
      const narrowed = requestedUserIds.filter((id) => deptSet.has(id.toString()));
      filter.user = { $in: narrowed.length > 0 ? narrowed : departmentUserIds };
    } else if (requestedUserIds.length > 0) {
      filter.user = { $in: requestedUserIds };
    }

    const docs = await AttendanceAssignment.find(filter)
      .populate('user', 'name email')
      .populate('shift');
    res.json(docs);
  } catch (err) {
    console.error('listAssignments error:', err);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
}

// Locations
export const validateLocation = [
  body('name').trim().notEmpty(),
  body('radiusMeters').optional().isNumeric(),
  body('latitude').isNumeric(),
  body('longitude').isNumeric(),
];

export async function listLocations(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.json([]);
    const docs = await AttendanceLocation.find({ workspace: workspaceId }).sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('listLocations error:', err);
    res.status(500).json({ message: 'Error fetching locations' });
  }
}

export async function createLocation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    // Only admin/manager can create locations
    if (isStaff(req.user)) {
      return res.status(403).json({ message: 'Access denied. Only admin/manager can create locations.' });
    }

    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const { name, radiusMeters = 50, latitude, longitude, allowedEmployees = [], allowedDepartments = [] } = req.body || {};
    const loc = await AttendanceLocation.create({
      workspace: workspaceId,
      name: name.trim(),
      radiusMeters,
      latitude,
      longitude,
      allowedEmployees: allowedEmployees.map(toObjectId),
      allowedDepartments,
      updatedBy: req.user?.id ? toObjectId(req.user.id) : null,
    });
    res.status(201).json(loc);
  } catch (err) {
    console.error('createLocation error:', err);
    res.status(500).json({ message: 'Error creating location' });
  }
}

export async function updateLocation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const { id } = req.params;
    const loc = await AttendanceLocation.findById(id);
    if (!loc || loc.workspace.toString() !== workspaceId.toString()) {
      return res.status(404).json({ message: 'Location not found' });
    }
    const { name, radiusMeters, latitude, longitude, allowedEmployees, allowedDepartments, flexibleEmployees } = req.body || {};
    if (name) loc.name = name.trim();
    if (radiusMeters !== undefined) loc.radiusMeters = radiusMeters;
    if (latitude !== undefined) loc.latitude = latitude;
    if (longitude !== undefined) loc.longitude = longitude;
    if (allowedEmployees) loc.allowedEmployees = allowedEmployees.map(toObjectId);
    if (allowedDepartments) loc.allowedDepartments = allowedDepartments;
    if (flexibleEmployees) loc.flexibleEmployees = flexibleEmployees.map(toObjectId);
    loc.updatedBy = req.user?.id ? toObjectId(req.user.id) : null;
    await loc.save();
    res.json(loc);
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ message: 'Error updating location' });
  }
}

export async function deleteLocation(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const { id } = req.params;
    const loc = await AttendanceLocation.findById(id);
    if (!loc || loc.workspace.toString() !== workspaceId.toString()) return res.status(404).json({ message: 'Location not found' });
    await AttendanceLocation.findByIdAndDelete(id);
    res.status(204).end();
  } catch (err) {
    console.error('deleteLocation error:', err);
    res.status(500).json({ message: 'Error deleting location' });
  }
}

// Device requests
export const validateDeviceRequest = [
  body('newDeviceId').optional().isString(),
  body('newDeviceName').optional().isString(),
  body('newDeviceType').optional().isString(),
];

export async function listDeviceRequests(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.json([]);
    const query = { workspace: workspaceId };

    // Role-based filtering
    if (isStaff(req.user)) {
      // Staff: only see their own requests
      query.user = toObjectId(req.user.id);
    } else if (isManager(req.user)) {
      // Manager: only see requests in their department
      const departmentUserIds = await getDepartmentUsersIds(req.user.department);
      if (departmentUserIds.length > 0) {
        query.user = { $in: departmentUserIds };
      } else {
        return res.json([]);
      }
    }
    // Admin: see all

    const docs = await AttendanceDeviceRequest.find(query).populate('user', 'name email department');
    res.json(docs);
  } catch (err) {
    console.error('listDeviceRequests error:', err);
    res.status(500).json({ message: 'Error fetching device requests' });
  }
}

export async function createDeviceRequest(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const userId = req.user?.id;
    const { oldDeviceId, oldDeviceName, oldDeviceType, newDeviceId, newDeviceName, newDeviceType, requireGps = true } = req.body || {};
    const doc = await AttendanceDeviceRequest.create({
      workspace: workspaceId,
      user: toObjectId(userId),
      oldDevice: { deviceId: oldDeviceId || '', deviceName: oldDeviceName || '', deviceType: oldDeviceType || '' },
      newDevice: { deviceId: newDeviceId || '', deviceName: newDeviceName || '', deviceType: newDeviceType || '' },
      requireGps: Boolean(requireGps),
      status: 'pending',
      requestedAt: new Date(),
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('createDeviceRequest error:', err);
    res.status(500).json({ message: 'Error creating device request' });
  }
}

export async function updateDeviceRequestStatus(req, res) {
  try {
    // Only admin/manager can approve/reject device requests
    if (isStaff(req.user)) {
      return res.status(403).json({ message: 'Access denied. Only admin/manager can review device requests.' });
    }

    const workspace = await resolveWorkspaceWithFallback(req.user);
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const doc = await AttendanceDeviceRequest.findById(id).populate('user', 'department');
    if (!doc || doc.workspace.toString() !== workspace.toString()) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Manager: only approve requests in their department
    if (isManager(req.user)) {
      const userDepartment = doc.user?.department || '';
      if (userDepartment !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only review requests in your department.' });
      }
    }

    doc.status = status;
    doc.reviewer = req.user?.id ? toObjectId(req.user.id) : null;
    doc.reviewedAt = new Date();
    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('updateDeviceRequestStatus error:', err);
    res.status(500).json({ message: 'Error updating status' });
  }
}

// Rules
export const validateRules = [
  body('delayToleranceMinutes').optional().isNumeric(),
  body('leaveEarlyToleranceMinutes').optional().isNumeric(),
  body('delayMinutes').optional().isNumeric(),
  body('leaveEarlyMinutes').optional().isNumeric(),
  body('allowOutsideLocation').optional().isBoolean(),
  body('allowOutsideDevice').optional().isBoolean(),
];

export async function getRules(req, res) {
  try {
    const workspaceId = toObjectId(req.user?.workspace);
    if (!workspaceId) {
      return res.json({
        delayToleranceMinutes: 10,
        leaveEarlyToleranceMinutes: 10,
        allowOutsideLocation: false,
        allowOutsideDevice: false,
      });
    }
    let rules = await AttendanceRule.findOne({ workspace: workspaceId });
    if (!rules) {
      rules = await AttendanceRule.create({ workspace: workspaceId });
    }
    res.json(rules);
  } catch (err) {
    console.error('getRules error:', err);
    res.status(500).json({ message: 'Error fetching rules' });
  }
}

export async function updateRules(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    // Only admin/manager can update rules
    if (isStaff(req.user)) {
      return res.status(403).json({ message: 'Access denied. Only admin/manager can update rules.' });
    }

    const workspace = req.user?.workspace;
    const payload = req.body || {};
    // Map frontend fields to schema fields for compatibility
    if (payload.delayMinutes !== undefined && payload.delayToleranceMinutes === undefined) {
      payload.delayToleranceMinutes = payload.delayMinutes;
    }
    if (payload.leaveEarlyMinutes !== undefined && payload.leaveEarlyToleranceMinutes === undefined) {
      payload.leaveEarlyToleranceMinutes = payload.leaveEarlyMinutes;
    }
    const rules = await AttendanceRule.findOneAndUpdate(
      { workspace },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(rules);
  } catch (err) {
    console.error('updateRules error:', err);
    res.status(500).json({ message: 'Error updating rules' });
  }
}

// Logs (history + checkin/checkout)
export const validateCheckin = [
  body('shiftId').optional().isString(),
  body('locationId').optional().isString(),
  body('deviceId').optional().isString(),
  body('photos').optional().isArray(),
  body('latitude').optional().isNumeric(),
  body('longitude').optional().isNumeric(),
];

export async function listLogs(req, res) {
  try {
    // Sử dụng resolveWorkspaceWithFallback để đảm bảo luôn có workspace hợp lệ
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) {
      return res.json([]);
    }
    const { start, end, userId } = req.query;
    const requestedUserIds = parseUserIds(req.query.userIds);
    const filter = { workspace: workspaceId };
    
    // Role-based filtering
    if (isStaff(req.user)) {
      // Staff: only see their own logs
      filter.user = toObjectId(req.user.id);
    } else if (isManager(req.user)) {
      const departmentUserIds = await getDepartmentUsersIds(req.user.department);
      if (!departmentUserIds.length) return res.json([]);
      const deptSet = new Set(departmentUserIds.map((id) => id.toString()));
      const narrowed = requestedUserIds.filter((id) => deptSet.has(id.toString()));
      filter.user = { $in: narrowed.length > 0 ? narrowed : departmentUserIds };
    } else if (requestedUserIds.length > 0) {
      filter.user = { $in: requestedUserIds };
    } else if (userId) {
      filter.user = toObjectId(userId);
    }
    // Admin without userId filter: see all
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
        return res.status(400).json({ message: 'Invalid date range' });
      }
      // Filter theo checkin.time - field chính xác nhất cho việc checkin
      filter['checkin.time'] = { $gte: startDate, $lte: endDate };
    }
    const docs = await AttendanceLog.find(filter)
      .populate('user', 'name email department')
      .populate('shift')
      .populate('location')
      .sort({ 'checkin.time': -1 });

    // Bổ sung trường date và shiftName để frontend hiển thị ổn định
    const normalized = docs.map((doc) => {
      const obj = doc.toObject({ virtuals: true });
      const checkinTime = obj.checkin?.time instanceof Date ? obj.checkin.time : obj.checkin?.time ? new Date(obj.checkin.time) : null;
      obj.date = checkinTime ? checkinTime.toISOString().slice(0, 10) : null;
      obj.shiftName = obj.shift?.name || null;

      // Tính lại đi muộn / về sớm / tăng ca dựa trên shift (kể cả khi log chưa có sẵn)
      const startMinutes = typeof obj.shift?.startMinutes === 'number' ? obj.shift.startMinutes : null;
      const endMinutes = typeof obj.shift?.endMinutes === 'number' ? obj.shift.endMinutes : null;
      const toMinutes = (d) => (d instanceof Date ? d : d ? new Date(d) : null)?.getHours() * 60 + ((d instanceof Date ? d : d ? new Date(d) : null)?.getMinutes() || 0);

      if (startMinutes != null && endMinutes != null) {
        const ciM = checkinTime ? toMinutes(checkinTime) : null;
        const coM = obj.checkout?.time ? toMinutes(obj.checkout.time) : null;

        // Xử lý ca qua ngày: nếu end <= start, coi như end + 24h
        const endEff = endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
        const norm = (m) => {
          if (m == null) return null;
          if (endEff > 24 * 60 && m < startMinutes) return m + 24 * 60; // checkout sau nửa đêm
          return m;
        };
        const ciEff = norm(ciM);
        const coEff = norm(coM);

        if (ciEff != null) {
          obj.lateMinutes = Math.max(0, ciEff - startMinutes);
        }
        if (coEff != null) {
          obj.earlyMinutes = Math.max(0, endEff - coEff);
          obj.overtimeMinutes = Math.max(0, coEff - endEff);
        }
      }

      return obj;
    });

    res.json(normalized);
  } catch (err) {
    console.error('listLogs error:', err);
    res.status(500).json({ message: 'Error fetching logs' });
  }
}

async function assertDeviceApproved(userId, workspace, deviceId, allowOutsideDevice) {
  if (allowOutsideDevice) return true;
  const approved = await AttendanceDeviceRequest.findOne({
    workspace,
    user: toObjectId(userId),
    status: 'approved',
    'newDevice.deviceId': deviceId,
  });
  return Boolean(approved);
}

async function assertLocationAllowed(userId, workspaceId, locationId, allowOutsideLocation, userDept = '') {
  if (allowOutsideLocation) return true;
  if (!locationId) return false;
  const loc = await AttendanceLocation.findById(locationId);
  if (!loc || loc.workspace.toString() !== workspaceId.toString()) return false;
  if (loc.flexibleEmployees?.some((e) => e.toString() === userId)) return true;
  if (loc.allowedEmployees?.some((e) => e.toString() === userId)) return true;
  if (userDept && Array.isArray(loc.allowedDepartments) && loc.allowedDepartments.includes(userDept)) return true;
  return false;
}

export async function checkin(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Checkin validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array(), message: 'Validation failed' });
  }
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    console.log('Checkin user:', { userId: req.user?.id, workspace: workspaceId, role: req.user?.role });
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const userId = req.user?.id;
    const rules = await AttendanceRule.findOne({ workspace: workspaceId }) || { allowOutsideLocation: false, allowOutsideDevice: false };
    const { shiftId, locationId, deviceId, photos = [], latitude, longitude } = req.body || {};

    console.log('Checkin payload:', { shiftId, locationId, deviceId, latitude, longitude, photosCount: photos.length });

    if (!deviceId) return res.status(400).json({ message: 'Thiết bị chưa được phê duyệt' });
    if (!locationId) return res.status(400).json({ message: 'Địa điểm không hợp lệ' });

    const deviceOk = await assertDeviceApproved(userId, workspaceId, deviceId, rules.allowOutsideDevice);
    if (!deviceOk) return res.status(403).json({ message: 'Thiết bị chưa được phê duyệt' });
    const locationOk = await assertLocationAllowed(
      userId,
      workspaceId,
      locationId,
      rules.allowOutsideLocation,
      req.user?.department || ''
    );
    if (!locationOk) return res.status(403).json({ message: 'Địa điểm không hợp lệ' });

    const now = new Date();
    const userName = req.user?.name || req.user?.fullName || req.user?.email || 'employee';
    let processedPhotos = Array.isArray(photos) ? [...photos] : [];
    if (processedPhotos.length > 0) {
      const uploadRes = await maybeUploadAttendancePhoto(processedPhotos[0], CHECKIN_FOLDER, userName, now);
      if (uploadRes?.url) {
        processedPhotos = [uploadRes.url];
      }
    }

    const log = await AttendanceLog.create({
      workspace: workspaceId,
      user: toObjectId(userId),
      shift: shiftId ? toObjectId(shiftId) : null,
      location: locationId ? toObjectId(locationId) : null,
      status: 'in-progress',
      checkin: {
        time: now,
        photos: processedPhotos,
        latitude,
        longitude,
        deviceId: deviceId || '',
      },
    });
    res.status(201).json(log);
  } catch (err) {
    console.error('checkin error:', err);
    res.status(500).json({ message: 'Error checkin' });
  }
}

export async function checkout(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const userId = req.user?.id;
    const { logId, photos = [], latitude, longitude, deviceId } = req.body || {};
    const log = await AttendanceLog.findById(logId);
    if (!log || log.workspace.toString() !== workspaceId.toString() || log.user.toString() !== userId) {
      return res.status(404).json({ message: 'Log not found' });
    }
    if (log.status === 'completed') return res.status(400).json({ message: 'Đã checkout' });

    // Ensure same device
    if (!deviceId || deviceId !== log.checkin.deviceId) {
      return res.status(403).json({ message: 'Thiết bị checkout không hợp lệ' });
    }

    // Chuẩn bị dữ liệu ca làm để tính trễ/sớm
    let shiftDoc = null;
    if (log.shift) {
      shiftDoc = await AttendanceShift.findById(log.shift);
    }

    const now = new Date();
    const userName = req.user?.name || req.user?.fullName || req.user?.email || 'employee';
    let processedPhotos = Array.isArray(photos) ? [...photos] : [];
    if (processedPhotos.length > 0) {
      const uploadRes = await maybeUploadAttendancePhoto(processedPhotos[0], CHECKOUT_FOLDER, userName, now);
      if (uploadRes?.url) {
        processedPhotos = [uploadRes.url];
      }
    }

    log.checkout = {
      time: now,
      photos: processedPhotos,
      latitude,
      longitude,
      deviceId,
    };
    log.status = 'completed';

    // Tính đi muộn / về sớm / tăng ca nếu có ca làm
    if (shiftDoc) {
      const toMinutes = (d) => d.getHours() * 60 + d.getMinutes();
      const checkinMinutes = log.checkin?.time instanceof Date ? toMinutes(log.checkin.time) : 0;
      const checkoutMinutes = toMinutes(now);
      const startMinutes = typeof shiftDoc.startMinutes === 'number' ? shiftDoc.startMinutes : null;
      const endMinutes = typeof shiftDoc.endMinutes === 'number' ? shiftDoc.endMinutes : null;

      if (startMinutes != null) {
        log.lateMinutes = Math.max(0, checkinMinutes - startMinutes);
      }
      if (endMinutes != null) {
        log.earlyMinutes = Math.max(0, endMinutes - checkoutMinutes);
        log.overtimeMinutes = Math.max(0, checkoutMinutes - endMinutes);
      }
    }

    await log.save();
    res.json(log);
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ message: 'Error checkout' });
  }
}

// Forms (leave requests, device changes, etc.)
export async function listForms(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.json([]);
    const query = { workspace: workspaceId };

    // Role-based filtering
    if (isStaff(req.user)) {
      // Staff: only see their own forms
      query.user = toObjectId(req.user.id);
    } else if (isManager(req.user)) {
      // Manager: only see forms in their department
      const departmentUserIds = await getDepartmentUsersIds(req.user.department);
      if (departmentUserIds.length > 0) {
        query.user = { $in: departmentUserIds };
      } else {
        return res.json([]);
      }
    }
    // Admin: see all

    const docs = await AttendanceForm.find(query)
      .populate('user', 'name email department')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('listForms error:', err);
    res.status(500).json({ message: 'Error fetching forms' });
  }
}

export async function createForm(req, res) {
  try {
    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    if (!workspaceId) return res.status(400).json({ message: 'Workspace is required' });
    const { type, reason, startDate, endDate } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const form = await AttendanceForm.create({
      workspace: workspaceId,
      user: toObjectId(req.user.id),
      type: type || 'leave',
      reason: reason.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      status: 'pending',
    });

    const populated = await AttendanceForm.findById(form._id)
      .populate('user', 'name email department')
      .populate('reviewer', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    console.error('createForm error:', err);
    res.status(500).json({ message: 'Error creating form' });
  }
}

export async function updateFormStatus(req, res) {
  try {
    // Only admin/manager can approve/reject forms
    if (isStaff(req.user)) {
      return res.status(403).json({ message: 'Access denied. Only admin/manager can review forms.' });
    }

    const workspaceId = await resolveWorkspaceWithFallback(req.user);
    const { id } = req.params;
    const { status, reviewNote } = req.body || {};

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const form = await AttendanceForm.findById(id).populate('user', 'department');
    if (!form || form.workspace.toString() !== workspaceId.toString()) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Manager: only review forms in their department
    if (isManager(req.user)) {
      const userDepartment = form.user?.department || '';
      if (userDepartment !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only review forms in your department.' });
      }
    }

    form.status = status;
    form.reviewer = toObjectId(req.user.id);
    form.reviewedAt = new Date();
    form.reviewNote = reviewNote || '';
    await form.save();

    const populated = await AttendanceForm.findById(form._id)
      .populate('user', 'name email department')
      .populate('reviewer', 'name email');

    res.json(populated);
  } catch (err) {
    console.error('updateFormStatus error:', err);
    res.status(500).json({ message: 'Error updating form status' });
  }
}

// Send notification for missing checkout
export async function sendLogNotification(req, res) {
  try {
    const { logId, note } = req.body || {};
    const userId = toObjectId(req.user?.id);

    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note is required' });
    }

    const log = await AttendanceLog.findById(logId);
    if (!log || log.user.toString() !== userId.toString()) {
      return res.status(404).json({ message: 'Log not found or access denied' });
    }

    // TODO: Implement notification system (e.g., send to admin/manager)
    // For now, just return success
    res.json({ success: true, message: 'Notification sent to admin/manager' });
  } catch (err) {
    console.error('sendLogNotification error:', err);
    res.status(500).json({ message: 'Error sending notification' });
  }
}
