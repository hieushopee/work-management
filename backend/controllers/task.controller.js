import { Task } from '../models/task.model.js';
import { User } from '../models/user.model.js';
import { Team } from '../models/team.model.js';
import { normalizeId, toObjectId } from '../utils/identifiers.js';

async function resolveAssignments(assignments) {
  const assignedUsers = new Set();
  const assignedTeams = new Set();
  const allUserIds = new Set();

  if (Array.isArray(assignments)) {
    for (const assignment of assignments) {
      const rawId = assignment?.id || assignment?._id || assignment;
      if (!rawId) continue;

      if (assignment?.type === 'team') {
        const teamId = toObjectId(rawId);
        if (teamId) {
          assignedTeams.add(teamId);
        }
      } else {
        // Default to employee if type is not team
        const userId = toObjectId(rawId);
        if (userId) {
          assignedUsers.add(userId);
          allUserIds.add(userId);
        }
      }
    }
  }

  if (assignedTeams.size > 0) {
    const teams = await Team.find({ _id: { $in: Array.from(assignedTeams) } }).select('members');
    const teamMembers = teams.flatMap((team) => (Array.isArray(team.members) ? team.members : []));
    teamMembers.forEach((memberId) => {
      const normalized = toObjectId(memberId);
      if (normalized) {
        allUserIds.add(normalized);
      }
    });
  }

  return {
    assignedUsers: Array.from(assignedUsers).filter(Boolean),
    assignedTeams: Array.from(assignedTeams).filter(Boolean),
    allUserIds: Array.from(allUserIds).filter(Boolean),
  };
}


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

const normalizePriorityValue = (priority) => {
  if (typeof priority !== 'string') return 'Medium';
  const normalized = priority.trim().toLowerCase();
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    normal: 'Medium',
    high: 'High',
    critical: 'Critical',
    urgent: 'Critical',
  };
  return priorityMap[normalized] || 'Medium';
};

const normalizeRoleValue = (role) =>
  String(role || 'staff')
    .trim()
    .toLowerCase();

// Helper function to check if user has owner-level permissions (admin or manager)
const hasOwnerPermissions = (user) => {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'manager';
};

const computeAggregateStatus = (statuses = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return 'todo';
  }
  const employeeStatuses = statuses.filter(
    (entry) => normalizeRoleValue(entry.role) === 'staff'
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
    const userObjectId = toObjectId(entry.user);
    if (!userObjectId) return;
    const key = userObjectId.toString();
    existingMap.set(key, {
      user: userObjectId,
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
        ? roleMap.get(key) || 'staff'
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

const buildAssignedIdSet = (task) => {
  if (!task) return new Set();
  const assignedUsers = Array.isArray(task.assignedTo) ? task.assignedTo : [];
  const assignedTeams = Array.isArray(task.assignedTeams) ? task.assignedTeams : [];
  const values = [...assignedUsers, ...assignedTeams]
    .map((entry) => normalizeId(entry))
    .filter((value) => typeof value === 'string' && value.length > 0);
  return new Set(values);
};

const getUserTeamIds = (user) => {
  if (!user) return [];
  const teams = Array.isArray(user.teams) ? user.teams : [];
  const teamIds = Array.isArray(user.teamIds) ? user.teamIds : [];
  const combined = [...teams, ...teamIds];

  return combined
    .map((team) => {
      if (!team) return null;
      if (typeof team === 'string') return team;
      if (typeof team === 'object') {
        if (team._id) return team._id.toString();
        if (team.id) return String(team.id);
      }
      return normalizeId(team);
    })
    .filter((value) => typeof value === 'string' && value.length > 0);
};

const isUserAssignedToTask = (assignedIds, userId) => {
  if (!assignedIds || !userId) return false;
  return assignedIds.has(userId.toString());
};

const getRequesterId = (req) => {
  if (!req?.user) return null;
  return toObjectId(req.user.id || req.user._id);
};

const canCollaborateOnTask = (task, user) => {
  if (!task || !user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'manager') return true;
  const assignedIds = buildAssignedIdSet(task);
  const requesterId = toObjectId(user.id || user._id);
  if (requesterId && isUserAssignedToTask(assignedIds, requesterId)) {
    return true;
  }
  const userTeamIds = getUserTeamIds(user);
  if (userTeamIds.length === 0) return false;
  return userTeamIds.some((teamId) => assignedIds.has(teamId));
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
  serialized.priority = normalizePriorityValue(serialized.priority);
  serialized.comments = Array.isArray(serialized.comments)
    ? [...serialized.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];
  serialized.checklist = Array.isArray(serialized.checklist)
    ? [...serialized.checklist].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];
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
  const { name, description, status, deadline, assignedTo, priority } = req.body || {};
  const requesterId = toObjectId(req.user?.id);

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Task name is required.' });
  }

  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Task description is required.' });
  }

  try {
    const { assignedUsers, assignedTeams, allUserIds } = await resolveAssignments(assignedTo);

    if (allUserIds.length === 0 && requesterId) {
      // Fallback to user from request if no one is assigned
      allUserIds.push(requesterId);
      if (!assignedUsers.find((u) => u.toString() === requesterId.toString())) {
        assignedUsers.push(requesterId);
      }
    }

    const initialStatus = normalizeStatusValue(status || 'todo');
    const initialStatuses = allUserIds.map((userId) => ({
      user: userId,
      status: initialStatus,
    }));

    const assigneeStatuses = allUserIds.length
      ? await buildAssigneeStatuses(allUserIds, initialStatuses)
      : [];
    const aggregateStatus = computeAggregateStatus(assigneeStatuses);

    const task = await Task.create({
      assignedTo: assignedUsers,
      assignedTeams: assignedTeams,
      assigneeStatuses,
      name: name.trim(),
      description: description.trim(),
      status: aggregateStatus,
      deadline: parseDeadline(deadline),
      priority: normalizePriorityValue(priority),
      createdBy: requesterId,
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
    // Find user to get their teams
    const user = await User.findById(assignedObjectId).select('teams').lean();
    const userTeamIds = user ? (user.teams || []).map(toObjectId) : [];

    const tasks = await Task.find({
      $or: [
        { assignedTo: { $in: [assignedObjectId] } },
        { assignedTeams: { $in: userTeamIds } }
      ]
    }).populate({
      path: 'assignedTeams',
      select: 'members'
    });

    const serializedTasks = await Promise.all(tasks.map(async (task) => {
        const assignedUsers = Array.isArray(task.assignedTo) ? task.assignedTo : [];
        const allUserIds = new Set(
          assignedUsers.filter(Boolean).map((id) => id.toString())
        );

        const assignedTeams = Array.isArray(task.assignedTeams) ? task.assignedTeams : [];
        for (const team of assignedTeams) {
          const members = Array.isArray(team?.members) ? team.members : [];
          members.forEach((memberId) => {
            if (memberId) allUserIds.add(memberId.toString());
          });
        }

        const allUserObjectIds = Array.from(allUserIds)
          .map(toObjectId)
          .filter(Boolean);

      const assigneeStatuses = await buildAssigneeStatuses(
        allUserObjectIds,
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
  const { name, description, status, deadline, assignedTo, priority } = req.body || {};

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (typeof name === 'string' && name.trim()) task.name = name.trim();
    if (typeof description === 'string' && description.trim()) task.description = description.trim();
    if (typeof status === 'string') task.status = normalizeStatusValue(status);
    if (deadline !== undefined) task.deadline = parseDeadline(deadline);
    if (typeof priority === 'string') task.priority = normalizePriorityValue(priority);

    if (assignedTo !== undefined) {
      const { assignedUsers, assignedTeams, allUserIds } = await resolveAssignments(assignedTo);
      
      const updatedAssigneeStatuses = await buildAssigneeStatuses(
        allUserIds,
        resolveExistingStatuses(task)
      );
      task.assignedTo = assignedUsers;
      task.assignedTeams = assignedTeams;
      task.assigneeStatuses = updatedAssigneeStatuses;
      task.status = computeAggregateStatus(updatedAssigneeStatuses);
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
    const requesterRole = normalizeRoleValue(req.user?.role);
    const isOwnerLevel = requesterRole === 'admin' || requesterRole === 'manager';

    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for status update.' });
    }

    const assignedIdSet = buildAssignedIdSet(task);
    const isAssigned = isUserAssignedToTask(assignedIdSet, requesterId);
    const isCreator = task.createdBy && requesterId.equals(toObjectId(task.createdBy));

    // Admin/manager or creator can override status even if not explicitly assigned
    if (!isAssigned && !isOwnerLevel && !isCreator) {
      return res.status(403).json({ error: 'You are not assigned to this task.' });
    }

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );
    const targetIndex = assigneeStatuses.findIndex(
      (entry) => entry.user?.toString() === requesterId.toString()
    );

    let statusIndex = targetIndex;
    if (statusIndex === -1) {
      // If not assigned but allowed (admin/manager/creator), append a status entry
      if (isOwnerLevel || isCreator) {
        assigneeStatuses.push({
          user: requesterId,
          role: requesterRole,
          status: normalizedStatus,
          updatedAt: new Date(),
        });
        statusIndex = assigneeStatuses.length - 1;
      } else {
        return res.status(403).json({ error: 'Unable to update status for this assignee.' });
      }
    }

    assigneeStatuses[statusIndex] = {
      ...assigneeStatuses[statusIndex],
      status: normalizedStatus,
      role: assigneeStatuses[statusIndex].role || requesterRole,
      updatedAt: new Date(),
    };

    task.assigneeStatuses = assigneeStatuses;
    const computedStatus = computeAggregateStatus(assigneeStatuses);

    // Use atomic update to avoid version conflicts
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        $set: {
          assigneeStatuses,
          status: computedStatus,
        },
      },
      { new: true }
    );

    const serializedTask = serializeTask(updatedTask || task, {
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

export const addTaskComment = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body || {};
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to comment on this task.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    task.comments = Array.isArray(task.comments) ? task.comments : [];
    task.comments.push({
      author: requesterId,
      authorName: req.user?.name || req.user?.email || 'Unknown member',
      message: trimmedMessage,
      createdAt: new Date(),
    });

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );
    await task.save();

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in addTaskComment:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateTaskComment = async (req, res) => {
  const { id, commentId } = req.params;
  const { message } = req.body || {};
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to comment on this task.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    const comment = Array.isArray(task.comments)
      ? task.comments.find((entry) => entry._id?.toString() === commentId)
      : null;

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const isOwner = hasOwnerPermissions(req.user);
    const isAuthor = comment.author && comment.author.toString() === requesterId.toString();

    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: 'Only the comment author or admin/manager can edit this comment.' });
    }

    comment.message = trimmedMessage;
    comment.editedAt = new Date();

    task.markModified('comments');
    await task.save();

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in updateTaskComment:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteTaskComment = async (req, res) => {
  const { id, commentId } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to modify comments on this task.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    const comments = Array.isArray(task.comments) ? task.comments : [];
    const index = comments.findIndex((entry) => entry._id?.toString() === commentId);

    if (index === -1) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const comment = comments[index];
    const isOwner = hasOwnerPermissions(req.user);
    const isAuthor = comment.author && comment.author.toString() === requesterId.toString();

    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: 'Only the comment author or admin/manager can delete this comment.' });
    }

    comments.splice(index, 1);
    task.comments = comments;
    task.markModified('comments');
    await task.save();

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in deleteTaskComment:', error);
    res.status(500).json({ error: error.message });
  }
};

export const addChecklistItem = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body || {};
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';

  if (!trimmedTitle) {
    return res.status(400).json({ error: 'Checklist title is required.' });
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to update this task checklist.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    task.checklist = Array.isArray(task.checklist) ? task.checklist : [];
    task.checklist.push({
      title: trimmedTitle,
      createdBy: requesterId,
      createdAt: new Date(),
    });

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );
    await task.save();

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in addChecklistItem:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateChecklistItem = async (req, res) => {
  const { id, itemId } = req.params;
  const { completed, title, assignedTo, dueDate } = req.body || {};
  const hasCompletedUpdate = completed !== undefined;
  const hasTitleUpdate = typeof title === 'string';
  const hasAssigneeUpdate = assignedTo !== undefined;
  const hasDueDateUpdate = dueDate !== undefined;
  const requiresAuthorPermission = hasTitleUpdate || hasAssigneeUpdate || hasDueDateUpdate;

  if (!hasCompletedUpdate && !hasTitleUpdate && !hasAssigneeUpdate && !hasDueDateUpdate) {
    return res.status(400).json({ error: 'No checklist updates provided.' });
  }

  const normalizedCompleted = hasCompletedUpdate
    ? typeof completed === 'boolean'
      ? completed
      : Boolean(completed)
    : null;
  const trimmedTitle = hasTitleUpdate ? title.trim() : null;

  if (hasTitleUpdate && !trimmedTitle) {
    return res.status(400).json({ error: 'Checklist title cannot be empty.' });
  }

  const normalizedAssignee =
    hasAssigneeUpdate && assignedTo && assignedTo !== 'unassigned'
      ? toObjectId(assignedTo)
      : null;

  if (hasAssigneeUpdate && assignedTo && assignedTo !== 'unassigned' && !normalizedAssignee) {
    return res.status(400).json({ error: 'Invalid assignee.' });
  }

  let parsedDueDate = null;
  if (hasDueDateUpdate) {
    if (dueDate) {
      parsedDueDate = parseDeadline(dueDate);
      if (!parsedDueDate) {
        return res.status(400).json({ error: 'Invalid due date.' });
      }
    } else {
      parsedDueDate = null;
    }
  }

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to update this checklist item.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    const checklistItem = Array.isArray(task.checklist)
      ? task.checklist.find((item) => item._id?.toString() === itemId)
      : null;

    if (!checklistItem) {
      return res.status(404).json({ error: 'Checklist item not found.' });
    }

    const isOwner = hasOwnerPermissions(req.user);
    const requesterIdString = requesterId.toString();
    const isAuthor =
      checklistItem.createdBy && checklistItem.createdBy.toString() === requesterIdString;

    if (requiresAuthorPermission && !isOwner && !isAuthor) {
      return res.status(403).json({ error: 'Only the creator or admin/manager can edit this item.' });
    }

    if (hasTitleUpdate) {
      checklistItem.title = trimmedTitle;
    }

    if (hasAssigneeUpdate) {
      checklistItem.assignedTo = normalizedAssignee;
    }

    if (hasDueDateUpdate) {
      checklistItem.dueDate = parsedDueDate;
    }

    if (requiresAuthorPermission) {
      checklistItem.updatedAt = new Date();
    }

    if (hasCompletedUpdate) {
      const assignedUserId =
        checklistItem.assignedTo && checklistItem.assignedTo.toString();
      if (
        assignedUserId &&
        assignedUserId !== requesterIdString &&
        !isOwner
      ) {
        return res.status(403).json({
          error: 'Only the assigned member or owner can update completion.',
        });
      }

      checklistItem.completed = normalizedCompleted;
      checklistItem.completedBy = normalizedCompleted ? requesterId : null;
      checklistItem.completedAt = normalizedCompleted ? new Date() : null;
    }

    task.markModified('checklist');
    await task.save();

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in updateChecklistItem:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteChecklistItem = async (req, res) => {
  const { id, itemId } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!canCollaborateOnTask(task, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to modify this checklist.' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(400).json({ error: 'Unable to resolve user for this action.' });
    }

    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const index = checklist.findIndex((item) => item._id?.toString() === itemId);

    if (index === -1) {
      return res.status(404).json({ error: 'Checklist item not found.' });
    }

    const checklistItem = checklist[index];
    const isOwner = hasOwnerPermissions(req.user);
    const isAuthor =
      checklistItem.createdBy && checklistItem.createdBy.toString() === requesterId.toString();

    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: 'Only the creator or admin/manager can delete this item.' });
    }

    checklist.splice(index, 1);
    task.checklist = checklist;
    task.markModified('checklist');
    await task.save();

    const assigneeStatuses = await buildAssigneeStatuses(
      task.assignedTo,
      resolveExistingStatuses(task)
    );

    res.json({
      success: true,
      task: serializeTask(task, { statusesSnapshot: assigneeStatuses }),
    });
  } catch (error) {
    console.error('Error in deleteChecklistItem:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendUrgentNotification = async (req, res) => {
  const { checklistItemId, taskId, taskName, checklistItemTitle, reason, recipients } = req.body;

  if (!checklistItemId || !taskId || !reason || !Array.isArray(recipients)) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Verify task and checklist item exist
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const checklistItem = checklist.find((item) => item._id?.toString() === checklistItemId);
    if (!checklistItem) {
      return res.status(404).json({ error: 'Checklist item not found.' });
    }

    // Get all user IDs to notify
    const userIdsToNotify = new Set();
    
    for (const recipient of recipients) {
      if (recipient.type === 'user' && recipient.id) {
        userIdsToNotify.add(toObjectId(recipient.id));
      } else if (recipient.type === 'team' && recipient.id) {
        const team = await Team.findById(recipient.id).select('members');
        if (team && Array.isArray(team.members)) {
          team.members.forEach((memberId) => userIdsToNotify.add(toObjectId(memberId)));
        }
      } else if (recipient.type === 'department' && recipient.name) {
        const deptUsers = await User.find({ department: recipient.name }).select('_id');
        deptUsers.forEach((user) => userIdsToNotify.add(user._id));
      }
    }

    // TODO: Emit socket notification or save to notification collection
    // For now, just return success
    // In the future, you can integrate with socket.io or a notification service

    res.json({
      success: true,
      message: 'Urgent notification sent successfully',
      notifiedUsers: Array.from(userIdsToNotify).length,
    });
  } catch (error) {
    console.error('Error in sendUrgentNotification:', error);
    res.status(500).json({ error: error.message });
  }
};
