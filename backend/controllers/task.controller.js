import { Task } from '../models/task.model.js';
import { User } from '../models/user.model.js';
import { toObjectId } from '../utils/identifiers.js';

const parseDeadline = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatusValue = (status) => {
  const normalized = String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (['todo', 'doing', 'done'].includes(normalized)) return normalized;
  if (['pending', 'notstarted', 'awaiting', 'new'].includes(normalized)) return 'todo';
  if (['inprogress', 'progress', 'working'].includes(normalized)) return 'doing';
  if (['completed', 'complete', 'finished', 'resolved'].includes(normalized)) return 'done';
  return 'todo';
};

const normalizeRoleValue = (role) =>
  String(role || 'employee')
    .trim()
    .toLowerCase();

const computeAggregateStatus = (statuses = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return 'todo';
  }
  const employeeStatuses = statuses.filter(
    (entry) => normalizeRoleValue(entry.role) === 'employee'
  );
  const relevantStatuses = employeeStatuses.length > 0 ? employeeStatuses : statuses;
  const normalized = relevantStatuses.map((entry) => normalizeStatusValue(entry.status));

  if (normalized.some((status) => status === 'todo')) return 'todo';
  if (normalized.some((status) => status === 'doing')) return 'doing';
  return 'done';
};

const buildAssigneeStatuses = async (assignedIds = [], existingStatuses = []) => {
  const uniqueIds = Array.from(
    new Set(
      (assignedIds || [])
        .map((id) => toObjectId(id))
        .filter(Boolean)
        .map((id) => id.toString())
    )
  ).map((id) => toObjectId(id));

  if (!uniqueIds.length) return [];

  const existingMap = new Map();
  (Array.isArray(existingStatuses) ? existingStatuses : []).forEach((entry) => {
    if (!entry || !entry.user) return;
    const key = toObjectId(entry.user).toString();
    existingMap.set(key, {
      user: toObjectId(entry.user),
      status: normalizeStatusValue(entry.status),
      role: normalizeRoleValue(entry.role),
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
    });
  });

  const users = await User.find({ _id: { $in: uniqueIds } }, '_id role').lean();
  const roleMap = new Map(
    users.map((user) => [user._id.toString(), normalizeRoleValue(user.role)])
  );

  const now = new Date();

  return uniqueIds
    .map((id) => {
      const key = id.toString();
      const existingEntry = existingMap.get(key);
      const isUser = roleMap.has(key);

      if (!isUser && !existingEntry) {
        // Skip non-user identifiers (e.g., team ids) that we cannot resolve
        return null;
      }

      const resolvedRole = isUser
        ? roleMap.get(key) || 'employee'
        : 'team';

      const resolvedStatus = normalizeStatusValue(existingEntry?.status || 'todo');

      return {
        user: id,
        status: resolvedStatus,
        role: resolvedRole,
        updatedAt: existingEntry?.updatedAt ? new Date(existingEntry.updatedAt) : now,
      };
    })
    .filter(Boolean);
};

const resolveExistingStatuses = (task) => {
  if (!task) return [];
  if (Array.isArray(task.assigneeStatuses)) {
    return task.assigneeStatuses;
  }
  return [];
};

const serializeTask = (task, { userId, statusesSnapshot } = {}) => {
  const snapshot = Array.isArray(statusesSnapshot) ? statusesSnapshot : [];
  const serialized = task.toJSON();
  const aggregateStatus = computeAggregateStatus(snapshot);

  serialized.status = aggregateStatus;
  serialized.assigneeStatuses = snapshot.map((entry) => ({
    user: entry.user ? entry.user.toString() : null,
    status: normalizeStatusValue(entry.status),
    role: normalizeRoleValue(entry.role),
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
  }));

  if (userId) {
    const userIdString = userId.toString();
    const match = snapshot.find((entry) => entry.user?.toString() === userIdString);
    serialized.myStatus = normalizeStatusValue(match?.status || aggregateStatus);
  }

  return serialized;
};

export const createTask = async (req, res) => {
  const { id } = req.params;
  const { name, description, status, deadline, assignedTo } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Task name is required.' });
  }

  let assignedObjectIds = [];
  
  if (assignedTo && Array.isArray(assignedTo)) {
    assignedObjectIds = assignedTo.map(item => {
      if (typeof item === 'string') return toObjectId(item);
      if (item && typeof item === 'object' && item.id) return toObjectId(item.id);
      return null;
    }).filter(id => id !== null);
  } else if (assignedTo && typeof assignedTo === 'string') {
    const objectId = toObjectId(assignedTo);
    if (objectId) assignedObjectIds = [objectId];
  } else {
    const assignedObjectId = toObjectId(id);
    if (assignedObjectId) {
      assignedObjectIds = [assignedObjectId];
    }
  }

  if (assignedObjectIds.length === 0) {
    return res.status(400).json({ error: 'At least one assignee is required.' });
  }

  try {
    const initialStatus = normalizeStatusValue(status || 'todo');
    const initialStatuses = assignedObjectIds.map((userId) => ({
      user: userId,
      status: initialStatus,
    }));
    const assigneeStatuses = await buildAssigneeStatuses(assignedObjectIds, initialStatuses);
    const aggregateStatus = computeAggregateStatus(assigneeStatuses);

    const task = await Task.create({
      assignedTo: assignedObjectIds,
      assigneeStatuses,
      name,
      description: description || '',
      status: aggregateStatus,
      deadline: parseDeadline(deadline),
    });

    res.json({ success: true, task: serializeTask(task, { statusesSnapshot: assigneeStatuses }) });
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllTasks = async (_req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    const serializedTasks = await Promise.all(tasks.map(async (task) => {
      const assigneeStatuses = await buildAssigneeStatuses(
        task.assignedTo,
        resolveExistingStatuses(task)
      );
      return serializeTask(task, { statusesSnapshot: assigneeStatuses });
    }));

    res.json({ success: true, tasks: serializedTasks });
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTasksByUserId = async (req, res) => {
  const { id } = req.params;

  const assignedObjectId = toObjectId(id);
  if (!assignedObjectId) {
    return res.json({ success: true, tasks: [] });
  }

  try {
    const tasks = await Task.find({ assignedTo: { $in: [assignedObjectId] } });
    const serializedTasks = await Promise.all(tasks.map(async (task) => {
      const assigneeStatuses = await buildAssigneeStatuses(
        task.assignedTo,
        resolveExistingStatuses(task)
      );
      return serializeTask(task, { userId: assignedObjectId, statusesSnapshot: assigneeStatuses });
    }));

    res.json({ success: true, tasks: serializedTasks });
  } catch (error) {
    console.error('Error in getTasksByUserId:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateTaskById = async (req, res) => {
  const { id } = req.params;
  const { name, description, status, deadline, assignedTo } = req.body || {};

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (typeof name === 'string') task.name = name;
    if (typeof description === 'string') task.description = description;
    if (typeof status === 'string') task.status = normalizeStatusValue(status);
    if (deadline !== undefined) task.deadline = parseDeadline(deadline);

    if (assignedTo !== undefined) {
      if (Array.isArray(assignedTo)) {
        const objectIds = assignedTo.map(item => {
          if (typeof item === 'string') return toObjectId(item);
          if (item && typeof item === 'object' && item.id) return toObjectId(item.id);
          return null;
        }).filter(id => id !== null);
        
        const updatedAssigneeStatuses = await buildAssigneeStatuses(
          objectIds,
          resolveExistingStatuses(task)
        );
        task.assignedTo = objectIds;
        task.assigneeStatuses = updatedAssigneeStatuses;
        task.status = computeAggregateStatus(updatedAssigneeStatuses);
      } else if (typeof assignedTo === 'string') {
        const objectId = toObjectId(assignedTo);
        if (objectId) {
          const updatedAssigneeStatuses = await buildAssigneeStatuses(
            [objectId],
            resolveExistingStatuses(task)
          );
          task.assignedTo = [objectId];
          task.assigneeStatuses = updatedAssigneeStatuses;
          task.status = computeAggregateStatus(updatedAssigneeStatuses);
        }
      }
    } else if (Array.isArray(task.assignedTo)) {
      const syncedStatuses = await buildAssigneeStatuses(
        task.assignedTo,
        resolveExistingStatuses(task)
      );
      task.assigneeStatuses = syncedStatuses;
      task.status = computeAggregateStatus(syncedStatuses);
    }

    await task.save();

    const serializedTask = serializeTask(task, { statusesSnapshot: task.assigneeStatuses });
    res.json({ success: true, task: serializedTask });
  } catch (error) {
    console.error('Error in updateTaskById:', error);
    res.status(500).json({ error: error.message });
  }
};

export const changeTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const normalizedStatus = normalizeStatusValue(status);
    const requesterId = toObjectId(req.user?.id);

    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for status update.' });
    }

    const isAssigned = Array.isArray(task.assignedTo) &&
      task.assignedTo.some((assigneeId) => assigneeId.toString() === requesterId.toString());

    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to this task.' });
    }

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );
    const targetIndex = assigneeStatuses.findIndex(
      (entry) => entry.user?.toString() === requesterId.toString()
    );

    if (targetIndex === -1) {
      return res.status(403).json({ error: 'Unable to update status for this assignee.' });
    }

    assigneeStatuses[targetIndex] = {
      ...assigneeStatuses[targetIndex],
      status: normalizedStatus,
      role: assigneeStatuses[targetIndex].role || normalizeRoleValue(req.user?.role),
      updatedAt: new Date(),
    };

    task.assigneeStatuses = assigneeStatuses;
    task.status = computeAggregateStatus(assigneeStatuses);
    await task.save();

    const serializedTask = serializeTask(task, {
      userId: requesterId,
      statusesSnapshot: assigneeStatuses,
    });

    res.json({ success: true, task: serializedTask });
  } catch (error) {
    console.error('Error in changeTaskStatus:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteTaskById = async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteTaskById:', error);
    res.status(500).json({ error: error.message });
  }
};

export const togglePinTask = async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    task.isPinned = !task.isPinned;
    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );
    task.assigneeStatuses = assigneeStatuses;
    task.status = computeAggregateStatus(assigneeStatuses);
    await task.save();

    const requesterId = req.user?.id ? toObjectId(req.user.id) : null;

    res.json({
      success: true,
      task: serializeTask(task, {
        statusesSnapshot: assigneeStatuses,
        userId: requesterId || undefined,
      }),
    });
  } catch (error) {
    console.error('Error in togglePinTask:', error);
    res.status(500).json({ error: error.message });
  }
};
