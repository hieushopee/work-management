import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { CalendarEvent } from '../models/calendar.model.js';
import { User } from '../models/user.model.js';
import { toObjectId } from '../utils/identifiers.js';

const calendarUploadDir = path.join(process.cwd(), 'backend', 'uploads', 'calendar');

const ensureUploadDir = () => {
  if (!fs.existsSync(calendarUploadDir)) {
    fs.mkdirSync(calendarUploadDir, { recursive: true });
  }
};

const buildAttachmentPayload = (file) => ({
  filename: file.filename,
  originalName: file.originalname,
  mimeType: file.mimetype,
  size: file.size,
  url: '/uploads/calendar/' + file.filename,
});

const deleteAttachmentFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(calendarUploadDir, filename);
  fs.promises.unlink(filePath).catch(() => {});
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serializeEvent = (event) => {
  const json = event.toJSON();
  return {
    id: json.id,
    title: json.title,
    start: json.startDate,
    end: json.endDate,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
    assignedTo: json.assignedTo,
    createdById: json.createdById,
    createdByName: json.createdByName,
    createdByEmail: json.createdByEmail,
    attendance: json.attendance,
    shiftLogs: json.shiftLogs,
    taskDescription: json.taskDescription || '',
    reportNotes: json.reportNotes || '',
    reportAttachments: json.reportAttachments || [],
  };
};

export async function getEvents(req, res) {
  try {
    const { start, end, members } = req.query;

    const startDate = parseDateOrNull(start);
    const endDate = parseDateOrNull(end);

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Missing start or end' });
    }

    const memberIds = Array.isArray(members)
      ? members
      : members
      ? [members]
      : [];

    const objectIds = memberIds
      .map((id) => toObjectId(id))
      .filter((id) => id !== null);

    const workspaceId = toObjectId(req.user?.workspace);

    const query = {
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    };
    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (objectIds.length > 0) {
      query.assignedTo = { $in: objectIds };
    }

    const events = await CalendarEvent.find(query).sort({ startDate: 1 });

    res.json(events.map(serializeEvent));
  } catch (err) {
    console.error('? getEvents error:', err);
    res.status(500).json({ message: 'Error while fetching events' });
  }
}

export async function createEvent(req, res) {
  try {
    ensureUploadDir();
    // Workspace is best-effort; if missing/invalid, allow creation to avoid blocking users.
    const workspaceId = toObjectId(req.user?.workspace) || null;

    const {
      title,
      start,
      end,
      assignedTo,
      createdById,
      createdByName,
      createdByEmail,
      taskDescription = '',
      reportNotes = '',
    } = req.body || {};

    const startDate = parseDateOrNull(start);
    const endDate = parseDateOrNull(end);

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields to create event' });
    }

    const user = req.user || {
      id: createdById,
      name: createdByName,
      email: createdByEmail,
    };

    if (!user?.id) {
      return res.status(400).json({ message: 'Missing creator information' });
    }

    // If no assignees provided, default to the creator
    const assignedIds = Array.isArray(assignedTo) && assignedTo.length
      ? assignedTo
      : [user.id];
    const assignedObjectIds = assignedIds
      .map((id) => toObjectId(id) || id)
      .filter(Boolean);

    const attachments = Array.isArray(req.files)
      ? req.files.map((file) => buildAttachmentPayload(file))
      : [];

    const event = await CalendarEvent.create({
      title,
      startDate,
      endDate,
      assignedTo: assignedObjectIds,
      createdById: toObjectId(user.id) || user.id,
      createdByName: user.name || null,
      createdByEmail: user.email || null,
      ...(workspaceId ? { workspace: workspaceId } : {}),
      attendance: [],
      taskDescription: (taskDescription || '').trim(),
      reportNotes: (reportNotes || '').trim(),
      reportAttachments: attachments,
    });

    res.status(201).json(serializeEvent(event));
  } catch (err) {
    console.error('? createEvent error:', err);
    res.status(500).json({ message: 'Error while creating event' });
  }
}

export async function updateEvent(req, res) {
  try {
    ensureUploadDir();
    const workspaceId = toObjectId(req.user?.workspace);
    const { id } = req.params;
    const { title, start, end, assignedTo, taskDescription, reportNotes, removeAttachmentIds } = req.body || {};

    const event = await CalendarEvent.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isDifferentWorkspace =
      workspaceId &&
      event.workspace &&
      (typeof event.workspace.equals === 'function'
        ? !event.workspace.equals(workspaceId)
        : String(event.workspace) !== String(workspaceId));

    if (isDifferentWorkspace) {
      return res.status(403).json({ message: 'Access denied: Event belongs to a different workspace' });
    }

    if (title !== undefined) event.title = title;
    if (start) {
      const startDate = parseDateOrNull(start);
      if (startDate) event.startDate = startDate;
    }
    if (end) {
      const endDate = parseDateOrNull(end);
      if (endDate) event.endDate = endDate;
    }
    if (assignedTo) {
      const assignedIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      const assignedObjectIds = assignedIds
        .map((member) => toObjectId(member))
        .filter((member) => member !== null);
      if (assignedObjectIds.length) {
        event.assignedTo = assignedObjectIds;
      }
    }
    if (typeof taskDescription === 'string') {
      event.taskDescription = taskDescription.trim();
    }
    if (typeof reportNotes === 'string') {
      event.reportNotes = reportNotes.trim();
    }

    let removalIds = [];
    if (typeof removeAttachmentIds === 'string' && removeAttachmentIds.trim()) {
      try {
        removalIds = JSON.parse(removeAttachmentIds);
      } catch (error) {
        console.warn('Failed to parse removeAttachmentIds:', error);
      }
    } else if (Array.isArray(removeAttachmentIds)) {
      removalIds = removeAttachmentIds;
    }

    if (Array.isArray(removalIds) && removalIds.length) {
      event.reportAttachments = event.reportAttachments.filter((attachment) => {
        const shouldRemove = removalIds.includes(String(attachment._id));
        if (shouldRemove) {
          deleteAttachmentFile(attachment.filename);
        }
        return !shouldRemove;
      });
    }

    if (Array.isArray(req.files) && req.files.length) {
      const newAttachments = req.files.map((file) => buildAttachmentPayload(file));
      event.reportAttachments.push(...newAttachments);
    }

    await event.save();

    res.json(serializeEvent(event));
  } catch (err) {
    console.error('? updateEvent error:', err);
    res.status(500).json({ message: 'Error while updating event' });
  }
}

export async function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (Array.isArray(event.reportAttachments)) {
      event.reportAttachments.forEach((attachment) => {
        deleteAttachmentFile(attachment?.filename);
      });
    }

    res.status(204).end();
  } catch (err) {
    console.error('? deleteEvent error:', err);
    res.status(500).json({ message: 'Error while deleting event' });
  }
}

export async function markAttendance(req, res) {
  try {
    const { id } = req.params;
    const { userId, imageData, success: clientSuccess } = req.body || {};
    const workspaceId = toObjectId(req.user?.workspace);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    const event = await CalendarEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const isDifferentWorkspace =
      workspaceId &&
      event.workspace &&
      (typeof event.workspace.equals === 'function'
        ? !event.workspace.equals(workspaceId)
        : String(event.workspace) !== String(workspaceId));

    if (isDifferentWorkspace) {
      return res.status(403).json({ success: false, message: 'Access denied: Event belongs to a different workspace' });
    }

    const attendanceUser = await User.findById(userId);
    if (!attendanceUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let uploadedUrl = null;

    const hasFace = !!attendanceUser.faceUrl;
    const success = typeof clientSuccess === 'boolean' ? !!clientSuccess : hasFace;

    event.attendance.push({
      userId: toObjectId(userId) || userId,
      success,
      imageUrl: uploadedUrl || null,
      at: new Date(),
    });

    await event.save();

    res.json({
      success,
      message: success ? '? Face verification successful' : '? Face verification failed',
      imageUrl: uploadedUrl,
    });
  } catch (err) {
    console.error('? markAttendance error:', err);
    res.status(500).json({ success: false, message: 'Error during attendance', error: err.message });
  }
}

const ensureUserAssigned = (event, userId) => {
  if (!event || !Array.isArray(event.assignedTo)) return false;
  return event.assignedTo.some((assigned) => {
    try {
      return assigned && assigned.equals
        ? assigned.equals(userId)
        : String(assigned) === String(userId);
    } catch {
      return String(assigned) === String(userId);
    }
  });
};

const computeLateMinutes = (scheduledStart, actualStart) => {
  if (!(scheduledStart instanceof Date) || Number.isNaN(scheduledStart.getTime())) return 0;
  const diffMs = actualStart.getTime() - scheduledStart.getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
};

const computeOvertimeMinutes = (scheduledEnd, actualEnd) => {
  if (!(scheduledEnd instanceof Date) || Number.isNaN(scheduledEnd.getTime())) return 0;
  const diffMs = actualEnd.getTime() - scheduledEnd.getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
};

const computeTotalMinutes = (start, end) => {
  const diffMs = end.getTime() - start.getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
};

export async function startShift(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    const workspaceId = toObjectId(req.user?.workspace);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    const event = await CalendarEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const isDifferentWorkspace =
      workspaceId &&
      event.workspace &&
      (typeof event.workspace.equals === 'function'
        ? !event.workspace.equals(workspaceId)
        : String(event.workspace) !== String(workspaceId));

    if (isDifferentWorkspace) {
      return res.status(403).json({ success: false, message: 'Access denied: Event belongs to a different workspace' });
    }

    const objectUserId = toObjectId(userId) || userId;

    if (!ensureUserAssigned(event, objectUserId)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this event' });
    }

    const now = new Date();
    if (!now || Number.isNaN(now.getTime())) {
      return res.status(500).json({ success: false, message: 'Failed to capture current time' });
    }

    const scheduledStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
    const lateMinutes = computeLateMinutes(scheduledStart, now);

    const existingLog = event.shiftLogs.find((log) =>
      log.userId && log.userId.equals
        ? log.userId.equals(objectUserId)
        : String(log.userId) === String(objectUserId)
    );

    if (existingLog) {
      existingLog.startedAt = now;
      existingLog.endedAt = null;
      existingLog.totalMinutes = 0;
      existingLog.lateMinutes = lateMinutes;
      existingLog.overtimeMinutes = 0;
    } else {
      event.shiftLogs.push({
        userId: objectUserId,
        startedAt: now,
        endedAt: null,
        totalMinutes: 0,
        lateMinutes,
        overtimeMinutes: 0,
      });
    }

    await event.save();
    res.json({ success: true, event: serializeEvent(event) });
  } catch (err) {
    console.error('? startShift error:', err);
    res.status(500).json({ success: false, message: 'Error while starting shift', error: err.message });
  }
}

export async function endShift(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    const workspaceId = toObjectId(req.user?.workspace);

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    const event = await CalendarEvent.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const isDifferentWorkspace =
      workspaceId &&
      event.workspace &&
      (typeof event.workspace.equals === 'function'
        ? !event.workspace.equals(workspaceId)
        : String(event.workspace) !== String(workspaceId));

    if (isDifferentWorkspace) {
      return res.status(403).json({ success: false, message: 'Access denied: Event belongs to a different workspace' });
    }

    const objectUserId = toObjectId(userId) || userId;

    if (!ensureUserAssigned(event, objectUserId)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this event' });
    }

    const attendanceOk = Array.isArray(event.attendance)
      && event.attendance.some((entry) => {
        const entryUser = entry.userId;
        const matches = entryUser && entryUser.equals
          ? entryUser.equals(objectUserId)
          : String(entryUser) === String(objectUserId);
        return matches && entry.success;
      });

    if (!attendanceOk) {
      return res.status(400).json({
        success: false,
        message: 'Attendance must be marked before ending the shift',
      });
    }

    const log = event.shiftLogs.find((entry) =>
      entry.userId && entry.userId.equals
        ? entry.userId.equals(objectUserId)
        : String(entry.userId) === String(objectUserId)
    );

    if (!log || !log.startedAt) {
      return res.status(400).json({
        success: false,
        message: 'Shift has not been started yet',
      });
    }

    const now = new Date();
    if (!now || Number.isNaN(now.getTime())) {
      return res.status(500).json({ success: false, message: 'Failed to capture current time' });
    }

    const scheduledEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);

    log.endedAt = now;
    log.totalMinutes = computeTotalMinutes(new Date(log.startedAt), now);
    log.overtimeMinutes = computeOvertimeMinutes(scheduledEnd, now);

    await event.save();
    res.json({ success: true, event: serializeEvent(event) });
  } catch (err) {
    console.error('? endShift error:', err);
    res.status(500).json({ success: false, message: 'Error while ending shift', error: err.message });
  }
}




