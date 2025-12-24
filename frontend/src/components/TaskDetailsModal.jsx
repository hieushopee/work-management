import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ClipboardList,
  ListChecks,
  MessageSquare,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  Users,
  X,
  CircleUserRoundIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import { getPriorityMeta, getStatusMeta } from '../utils/taskBoardConfig';
import { useTaskStore } from '../stores/useTaskStore';
import useUserStore from '../stores/useUserStore';
import { hasOwnerPermissions } from '../utils/roleUtils';
import axios from '../libs/axios';

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (value.id) return toIdString(value.id);
    if (value._id) return toIdString(value._id);
    if (value.teamId) return toIdString(value.teamId);
    if (value.userId) return toIdString(value.userId);
    if (typeof value.toString === 'function') {
      const serialized = value.toString();
      if (serialized && serialized !== '[object Object]') {
        return serialized;
      }
    }
  }
  return null;
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const TaskDetailsModal = ({ task, onClose, assignees = [], assignmentOptions = [] }) => {
  const [activeTab, setActiveTab] = useState('comments');
  const [commentText, setCommentText] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [checklistMenuId, setChecklistMenuId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [commentActionLoading, setCommentActionLoading] = useState(false);
  const [checklistActionLoading, setChecklistActionLoading] = useState(false);
  const [editingChecklistAssignee, setEditingChecklistAssignee] = useState('unassigned');
  const [editingChecklistDue, setEditingChecklistDue] = useState('');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);

  const addTaskComment = useTaskStore((state) => state.addTaskComment);
  const addChecklistItem = useTaskStore((state) => state.addChecklistItem);
  const toggleChecklistItem = useTaskStore((state) => state.toggleChecklistItem);
  const updateTaskComment = useTaskStore((state) => state.updateTaskComment);
  const deleteTaskComment = useTaskStore((state) => state.deleteTaskComment);
  const updateChecklistDetails = useTaskStore((state) => state.updateChecklistDetails);
  const deleteChecklistItem = useTaskStore((state) => state.deleteChecklistItem);
  const { user } = useUserStore();
  const userId = toIdString(user?.id || user?._id);
  const userRole = String(user?.role || '').toLowerCase();

  if (!task) return null;

  const comments = useMemo(
    () => (Array.isArray(task.comments) ? task.comments : []),
    [task.comments]
  );
  const checklist = useMemo(
    () => (Array.isArray(task.checklist) ? task.checklist : []),
    [task.checklist]
  );
  const fallbackAssignments = useMemo(() => {
    const entries = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    return entries
      .map((entry) => {
        const typeHint = entry?.type || entry?.kind;
        if (typeHint && typeHint !== 'employee') return null;
        const id = toIdString(
          entry?.id ?? entry?._id ?? entry?.user ?? entry?.userId ?? entry
        );
        if (!id) return null;
        const label =
          entry?.name ||
          entry?.label ||
          entry?.fullName ||
          entry?.email ||
          (typeof entry === 'string' ? entry : id);
        return { id, label, type: 'employee' };
      })
      .filter(Boolean);
  }, [task.assignedTo]);
  const normalizedAssignmentOptions = useMemo(() => {
    const providedOptions = Array.isArray(assignmentOptions) ? assignmentOptions : [];
    const combined = providedOptions.length ? providedOptions : fallbackAssignments;
    const seen = new Set();
    const normalized = [];
    combined.forEach((option) => {
      if (!option) return;
      const id = toIdString(
        option.id ?? option.value ?? option.userId ?? option._id ?? option.user ?? option
      );
      if (!id) return;
      const type = option.type || 'employee';
      if (type !== 'employee') return;
      if (seen.has(id)) return;
      seen.add(id);
      const label =
        option.label ||
        option.name ||
        option.fullName ||
        option.email ||
        (typeof option === 'string' ? option : id);
      normalized.push({ id, label });
    });
    return normalized;
  }, [assignmentOptions, fallbackAssignments]);
  const assigneeSelectOptions = useMemo(
    () => [{ id: 'unassigned', label: 'Unassigned' }, ...normalizedAssignmentOptions],
    [normalizedAssignmentOptions]
  );
  const assigneeLabelMap = useMemo(() => {
    const map = new Map();
    assigneeSelectOptions.forEach((option) => {
      map.set(option.id, option.label);
    });
    return map;
  }, [assigneeSelectOptions]);
  
  // Map to get employee info (including avatar) by ID
  const assigneeInfoMap = useMemo(() => {
    const map = new Map();
    const allOptions = [
      ...(Array.isArray(assignmentOptions) ? assignmentOptions : []),
      ...(Array.isArray(assignees) ? assignees : []),
    ];
    allOptions.forEach((option) => {
      const id = toIdString(
        option.id ?? option.value ?? option.userId ?? option._id ?? option.user ?? option
      );
      if (id) {
        map.set(id, {
          id,
          label: option.label || option.name || option.fullName || option.email || id,
          avatar: option.avatar || null,
        });
      }
    });
    return map;
  }, [assignmentOptions, assignees]);
  const assignedIdList = useMemo(() => {
    const rawAssigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const ids = rawAssigned
      .map((entry) => toIdString(entry))
      .filter((value) => typeof value === 'string' && value.length > 0);
    return Array.from(new Set(ids));
  }, [task.assignedTo]);
  const userTeamIds = useMemo(() => {
    if (!user) return [];
    const teams = Array.isArray(user.teams) ? user.teams : [];
    const teamIds = Array.isArray(user.teamIds) ? user.teamIds : [];
    const ids = [...teams, ...teamIds]
      .map((entry) => toIdString(entry))
      .filter((value) => typeof value === 'string' && value.length > 0);
    return Array.from(new Set(ids));
  }, [user]);
  const canCollaborate = useMemo(() => {
    if (hasOwnerPermissions(user)) return true;
    const assignedSet = new Set(assignedIdList);
    if (userId && assignedSet.has(userId)) return true;
    if (userTeamIds.length === 0) return false;
    return userTeamIds.some((teamId) => assignedSet.has(teamId));
  }, [assignedIdList, userRole, userId, userTeamIds]);

  useEffect(() => {
    const handleClick = () => {
      setCommentMenuId(null);
      setChecklistMenuId(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  const orderedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ),
    [comments]
  );
  const checklistCompletedCount = checklist.filter((item) => item.completed).length;
  const rawChecklistProgress = checklist.length
    ? (checklistCompletedCount / checklist.length) * 100
    : 0;
  const checklistProgress = Math.round(rawChecklistProgress * 10) / 10;
  const checklistSummary = `${checklistCompletedCount}/${checklist.length || 0} completed`;
  const checklistPercentLabel = checklist.length
    ? `${rawChecklistProgress.toFixed(1).replace(/\\.0$/, '')}%`
    : null;
  const progress = checklist.length ? checklistProgress : 0;
  const overallProgressValue = checklist.length ? checklistProgress : progress;
  const overallProgressLabel = checklist.length
    ? `${checklistSummary}${checklistPercentLabel ? ` (${checklistPercentLabel})` : ''}`
    : `${progress}%`;
  const derivedStage = checklist.length
    ? (checklistCompletedCount === checklist.length ? 'done' : 'doing')
    : (task?.status || 'todo');
  const statusMeta = getStatusMeta(derivedStage);
  const priorityMeta = getPriorityMeta(task.priority);
  const StatusIcon = statusMeta.icon;

  const tabs = [
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageSquare,
      count: comments.length,
    },
    {
      key: 'checklist',
      label: 'Checklist',
      icon: ListChecks,
      count: checklist.length,
    },
  ];

  const handleCommentSubmit = async () => {
    if (!canCollaborate || !commentText.trim()) return;
    try {
      setCommentLoading(true);
      await addTaskComment(task.id, commentText.trim());
      setCommentText('');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleChecklistSubmit = async () => {
    if (!canCollaborate || !checklistText.trim()) return;
    try {
      setChecklistLoading(true);
      await addChecklistItem(task.id, checklistText.trim());
      setChecklistText('');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!taskDescription.trim()) return;
    
    try {
      setSuggestionsLoading(true);
      const prompt = `Based on the following task description, suggest a comprehensive checklist of actionable items. Return only a JSON array of strings, each string being a checklist item. Do not include any other text or explanation, just the JSON array.

Task description: ${taskDescription}

Example format: ["Item 1", "Item 2", "Item 3"]`;

      const response = await axios.post('/ai/chat', {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        userId: userId,
        temperature: 0.7,
        maxTokens: 1000,
      });

      const aiContent = response.data.choices?.[0]?.message?.content || '';
      
      // Try to extract JSON array from the response
      let parsedSuggestions = [];
      try {
        // Try to find JSON array in the response
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedSuggestions = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON array, try to parse the whole response
          parsedSuggestions = JSON.parse(aiContent);
        }
      } catch (e) {
        // If JSON parsing fails, try to extract list items from markdown or plain text
        const lines = aiContent.split('\n').filter(line => line.trim());
        parsedSuggestions = lines
          .map(line => {
            // Remove markdown list markers (-, *, 1., etc.)
            const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
            // Remove quotes if present
            return cleaned.replace(/^["']|["']$/g, '');
          })
          .filter(item => item.length > 0)
          .slice(0, 10); // Limit to 10 items
      }

      if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
        setSuggestions(parsedSuggestions);
      } else {
        setSuggestions(['Unable to generate suggestions. Please try again.']);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions(['Error generating suggestions. Please try again.']);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleToggleSuggestion = (index) => {
    setSelectedSuggestions((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleAddSelectedSuggestions = async () => {
    if (selectedSuggestions.length === 0) return;

    try {
      setChecklistLoading(true);
      for (const index of selectedSuggestions) {
        if (suggestions[index]) {
          await addChecklistItem(task.id, suggestions[index]);
        }
      }
      setShowSuggestionModal(false);
      setTaskDescription('');
      setSuggestions([]);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('Error adding suggestions:', error);
      alert('Error adding checklist items. Please try again.');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleToggleChecklist = async (item, nextState) => {
    if (!canCollaborate) return;
    try {
      setTogglingId(item.id);
      await toggleChecklistItem(task.id, item.id, nextState);
    } finally {
      setTogglingId(null);
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.message);
    setCommentMenuId(null);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    try {
      setCommentActionLoading(true);
      await updateTaskComment(task.id, editingCommentId, editingCommentText.trim());
      cancelEditComment();
    } finally {
      setCommentActionLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      setCommentActionLoading(true);
      setCommentMenuId(null);
      await deleteTaskComment(task.id, commentId);
    } finally {
      setCommentActionLoading(false);
      if (editingCommentId === commentId) {
        cancelEditComment();
      }
    }
  };

  const startEditChecklist = (item) => {
    setEditingChecklistId(item.id);
    setEditingChecklistText(item.title);
    setEditingChecklistAssignee(item.assignedTo || 'unassigned');
    setEditingChecklistDue(item.dueDate ? formatDateInputValue(item.dueDate) : '');
    setChecklistMenuId(null);
  };

  const cancelEditChecklist = () => {
    setEditingChecklistId(null);
    setEditingChecklistText('');
    setEditingChecklistAssignee('unassigned');
    setEditingChecklistDue('');
  };

  const saveEditChecklist = async () => {
    if (!editingChecklistId || !editingChecklistText.trim()) return;
    try {
      setChecklistActionLoading(true);
      await updateChecklistDetails(task.id, editingChecklistId, {
        title: editingChecklistText.trim(),
        assignedTo:
          editingChecklistAssignee === 'unassigned' ? null : editingChecklistAssignee,
        dueDate: editingChecklistDue || null,
      });
      cancelEditChecklist();
    } finally {
      setChecklistActionLoading(false);
    }
  };

  const handleDeleteChecklist = async (itemId) => {
    try {
      setChecklistActionLoading(true);
      setChecklistMenuId(null);
      await deleteChecklistItem(task.id, itemId);
    } finally {
      setChecklistActionLoading(false);
      if (editingChecklistId === itemId) {
        cancelEditChecklist();
      }
    }
  };

  const renderComments = () => (
    <div className="space-y-4">
      {orderedComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
          No comments yet. Start the conversation!
        </div>
      ) : (
        orderedComments.map((comment) => {
          const isSelf = userId && comment.author === userId;
          const isEditing = editingCommentId === comment.id;
          return (
            <div
              key={comment.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm relative"
            >
              <div className="flex items-start justify-between gap-2 text-sm text-slate-500 mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {isSelf ? 'You' : comment.authorName || 'Team member'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {comment.editedAt
                        ? `Edited ${formatDateTime(comment.editedAt)}`
                        : formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                </div>
                {isSelf && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentMenuId((prev) => (prev === comment.id ? null : comment.id));
                      }}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {commentMenuId === comment.id && (
                      <div
                        className="absolute right-0 mt-2 w-32 rounded-xl border border-slate-100 bg-white shadow-lg text-sm text-slate-600 overflow-hidden z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => startEditComment(comment)}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
                          disabled={commentActionLoading}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEditComment}
                      className="px-3 py-1.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      disabled={commentActionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEditComment}
                      disabled={!editingCommentText.trim() || commentActionLoading}
                      className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:bg-primary/30 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 whitespace-pre-line">{comment.message}</p>
              )}
            </div>
          );
        })
      )}

      <div className="rounded-3xl border border-slate-200 p-4 bg-white shadow-sm space-y-3">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            canCollaborate ? 'Add a comment...' : 'Only owners or assigned members can comment'
          }
          rows={3}
          disabled={!canCollaborate || commentLoading}
          className={`w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none ${
            canCollaborate
              ? 'focus:ring-2 focus:ring-primary/30'
              : 'bg-slate-50 text-slate-400 cursor-not-allowed'
          }`}
        />
        {canCollaborate ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || commentLoading}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-sm font-semibold text-white transition-all ${
                commentText.trim()
                  ? 'bg-primary hover:bg-primary-hover shadow-md'
                  : 'bg-primary/50 cursor-not-allowed'
              } ${commentLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Send className="w-4 h-4" />
              Post Comment
            </button>
          </div>
        ) : (
          <p className="text-xs text-right text-slate-400">
            Only the owner or assigned members (including assigned teams) can comment on this task.
          </p>
        )}
      </div>
    </div>
  );

  const renderChecklist = () => (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span className="font-semibold text-slate-800">Progress</span>
          <span className="text-xs text-slate-500">
            {checklistSummary}
            {checklistPercentLabel ? ` • ${checklistPercentLabel}` : ''}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${checklist.length ? checklistProgress : 0}%` }}
          />
        </div>
      </div>

                      {checklist.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                          No checklist items yet. Add the first task item below.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                          {checklist.map((item) => {
            const assignedMemberId =
              item.assignedTo && toIdString(item.assignedTo);
            const isAssignedToCurrentUser =
              assignedMemberId && userId && assignedMemberId === userId;
            const canToggleChecklist =
              canCollaborate &&
              (!assignedMemberId || isAssignedToCurrentUser || hasOwnerPermissions(user));
                            const isCreator = userId && item.createdBy === userId;
            const canEditEntry = isCreator || hasOwnerPermissions(user);
            const isEditing = editingChecklistId === item.id;
            const assignedLabel =
              assigneeLabelMap.get(item.assignedTo || 'unassigned') || null;
            const showAssignedLabel =
              assignedLabel && assignedLabel !== 'Unassigned';
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(item, !item.completed)}
                      disabled={!canToggleChecklist || togglingId === item.id}
                      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                        item.completed
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 text-transparent hover:border-primary'
                      } ${
                        togglingId === item.id
                          ? 'opacity-60 cursor-wait'
                          : !canToggleChecklist
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingChecklistText}
                            onChange={(e) => setEditingChecklistText(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                                ASSIGNED TO
                              </label>
                              <div className="flex items-center gap-2">
                                {editingChecklistAssignee && editingChecklistAssignee !== 'unassigned' ? (
                                  <>
                                    {(() => {
                                      const assigneeInfo = assigneeInfoMap.get(editingChecklistAssignee);
                                      const assigneeLabel = assigneeLabelMap.get(editingChecklistAssignee) || 'Unknown';
                                      const initials = assigneeLabel.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                      return (
                                        <>
                                          {assigneeInfo?.avatar ? (
                                            <img
                                              src={assigneeInfo.avatar}
                                              alt={assigneeLabel}
                                              className="w-10 h-10 rounded-full object-cover border-2 border-white"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                                              <span className="text-white text-xs font-semibold">{initials}</span>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </>
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-slate-500" />
                                  </div>
                                )}
                                <select
                                  value={editingChecklistAssignee}
                                  onChange={(e) => setEditingChecklistAssignee(e.target.value)}
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                  {assigneeSelectOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <input
                              type="date"
                              value={editingChecklistDue}
                              onChange={(e) => setEditingChecklistDue(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEditChecklist}
                              className="px-3 py-1.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                              disabled={checklistActionLoading}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveEditChecklist}
                              disabled={!editingChecklistText.trim() || checklistActionLoading}
                              className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:bg-primary/30 disabled:cursor-not-allowed"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className={`text-sm font-medium ${
                            item.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                          }`}
                        >
                          {item.title}
                        </p>
                      )}
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                        {showAssignedLabel && <span>{assignedLabel}</span>}
                        {item.dueDate && <span>Due {formatDate(item.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                  {canEditEntry && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChecklistMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {checklistMenuId === item.id && (
                        <div
                          className="absolute right-0 mt-2 w-32 rounded-xl border border-slate-100 bg-white shadow-lg text-sm text-slate-600 overflow-hidden z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => startEditChecklist(item)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklist(item.id)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
                            disabled={checklistActionLoading}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 p-4 bg-white shadow-sm space-y-3">
        {canCollaborate ? (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                placeholder="Add checklist item..."
                disabled={checklistLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && checklistText.trim() && !checklistLoading) {
                    handleChecklistSubmit();
                  }
                }}
                className={`flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none ${
                  canCollaborate
                    ? 'focus:ring-2 focus:ring-primary/30'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setTaskDescription(task.description || task.title || '');
                  setShowSuggestionModal(true);
                  setSuggestions([]);
                  setSelectedSuggestions([]);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-light/50 px-3 py-3 text-sm font-semibold text-primary hover:bg-primary-light transition-all whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Suggest Checklist</span>
              </button>
              <button
                type="button"
                onClick={handleChecklistSubmit}
                disabled={!checklistText.trim() || checklistLoading}
                className={`flex items-center justify-center rounded-2xl p-3 text-white transition-all ${
                  checklistText.trim()
                    ? 'bg-primary hover:bg-primary-hover shadow-md'
                    : 'bg-primary/50 cursor-not-allowed'
                } ${checklistLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
              placeholder="Only owners or assigned members can manage the checklist"
              disabled={true}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-right text-slate-400">
              Only the owner or assigned members (including assigned teams) can add checklist items.
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center px-4 py-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Suggest Checklist</h3>
              <button
                onClick={() => {
                  setShowSuggestionModal(false);
                  setTaskDescription('');
                  setSuggestions([]);
                  setSelectedSuggestions([]);
                }}
                className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description for AI to suggest checklist items..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSuggestions}
                disabled={!taskDescription.trim() || suggestionsLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {suggestionsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Suggestions
                  </>
                )}
              </button>

              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Select checklist items you want to add:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSuggestions.length === suggestions.length) {
                          setSelectedSuggestions([]);
                        } else {
                          setSelectedSuggestions(suggestions.map((_, i) => i));
                        }
                      }}
                      className="text-xs text-primary hover:text-primary-hover font-medium"
                    >
                      {selectedSuggestions.length === suggestions.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                    {suggestions.map((suggestion, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.includes(index)}
                          onChange={() => handleToggleSuggestion(index)}
                          className="mt-1 w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <span className="flex-1 text-sm text-slate-700">{suggestion}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSelectedSuggestions}
                    disabled={selectedSuggestions.length === 0 || checklistLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {checklistLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Add {selectedSuggestions.length > 0 ? `(${selectedSuggestions.length})` : ''} items
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold uppercase text-slate-900 tracking-wide">Task Overview</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
            type="button"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 border border-slate-100 rounded-2xl p-2 bg-slate-50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive ? 'bg-primary-light text-primary' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'comments' ? renderComments() : renderChecklist()}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5 space-y-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">{task.name}</h3>
                <p className="text-sm text-slate-600">{task.description || 'No description provided.'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">Stage</p>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.badgeClass}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusMeta.title}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">Priority</p>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${priorityMeta.chipClass}`}
                >
                  {priorityMeta.label}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">Assignees</p>
                {assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200"
                      >
                        <Users className="w-3 h-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Unassigned
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Created</p>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    {task.createdAt ? formatDate(task.createdAt) : 'Unknown'}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Due date</p>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    {task.deadline ? formatDate(task.deadline) : 'No due date'}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Overall Progress</p>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-inner">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>Task completion</span>
                    <span>{overallProgressLabel}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusMeta.progressColor}`}
                      style={{ width: `${overallProgressValue}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <ClipboardList className="w-4 h-4" />
                Last updated {task.updatedAt ? formatDate(task.updatedAt) : 'recently'}
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailsModal;
