import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Circle,
  Flag,
  ClipboardList,
  Eye,
  TrendingUp,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/LoadingSpinner';
import Filter from '../../components/Filter';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import {
  STATUS_COLUMNS,
  getPriorityMeta,
  normalizeTaskStatus,
} from '../../utils/taskBoardConfig';
import TaskListView from '../task/TaskListView';

const MyTasksPage = () => {
  const { user } = useUserStore();
  const { tasks, getTasksByUserId, changeTaskStatus, togglePinTask, loading, actionLoading } = useTaskStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const [viewMode, setViewMode] = useState('board');

  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const personalTasks = useMemo(() => {
    if (!user?.id) return safeTasks;
    const myId = user.id.toString();
    return safeTasks.filter((task) => {
      const assignedToUser =
        Array.isArray(task.assignedTo) &&
        task.assignedTo.some((id) => id && id.toString() === myId);
      const hasAssigneeStatus =
        Array.isArray(task.assigneeStatuses) &&
        task.assigneeStatuses.some((entry) => entry?.user && entry.user.toString() === myId);
      const isCreator = task.createdBy && task.createdBy.toString() === myId;
      return assignedToUser || hasAssigneeStatus || isCreator;
    });
  }, [safeTasks, user?.id]);
  const [filteredTasks, setFilteredTasks] = useState(personalTasks);
  const [viewTaskId, setViewTaskId] = useState(null);

  useEffect(() => {
    setFilteredTasks(personalTasks);
  }, [personalTasks]);

  useEffect(() => {
    if (user?.id) {
      getTasksByUserId(user.id);
    }
  }, [user?.id, getTasksByUserId]);

  useEffect(() => {
    if (!(Array.isArray(employees) && employees.length)) {
      getAllUsers();
    }
    if (!(Array.isArray(teams) && teams.length)) {
      getAllTeams();
    }
  }, [employees, teams, getAllUsers, getAllTeams]);

  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const teamList = useMemo(() => (Array.isArray(teams) ? teams : []), [teams]);
  const employeeMap = useMemo(() => {
    if (employeeList.length === 0) return {};
    return employeeList.reduce((acc, employee) => {
      const id = employee.id || employee._id;
      if (!id) return acc;
      acc[id] = employee;
      if (employee._id) acc[employee._id] = employee;
      return acc;
    }, {});
  }, [employeeList]);

  const getAssignmentTokens = useMemo(() => {
    return (task) => {
      if (!task) return [];
      const tokens = [];
      const seen = new Set();

      const pushToken = (label, key, type, valueId) => {
        if (!label || seen.has(key)) return;
        tokens.push({ label, key, type, id: valueId });
        seen.add(key);
      };

      if (Array.isArray(task.assignedTeams)) {
        task.assignedTeams.forEach((team) => {
          const teamId = team.id || team._id;
          if (teamId) {
            pushToken(team.name, `team:${teamId}`, 'team', teamId);
          }
        });
      }

      if (Array.isArray(task.assignedTo)) {
        const assignedTeamIds = new Set((task.assignedTeams || []).map((t) => t.id || t._id));

        task.assignedTo.forEach((userId) => {
          const user = employeeMap[userId];
          if (user) {
            const userTeamIds = new Set((user.teams || []).map((t) => t.id || t._id));
            const isCoveredByTeam = [...userTeamIds].some((teamId) => assignedTeamIds.has(teamId));

            if (!isCoveredByTeam) {
              pushToken(user.name, `employee:${userId}`, 'employee', userId);
            }
          }
        });
      }

      return tokens;
    };
  }, [employeeMap]);

  const buildChecklistAssigneeOptions = useMemo(
    () => (task) => {
      if (!task || !Array.isArray(task.assigneeStatuses)) return [];
      const options = [];
      const seen = new Set();

      task.assigneeStatuses.forEach((assignee) => {
        if (assignee.user && !seen.has(assignee.user)) {
          const employee = employeeMap[assignee.user];
          if (employee) {
            options.push({ id: employee.id, label: employee.name });
            seen.add(assignee.user);
          }
        }
      });

      return options;
    },
    [employeeMap]
  );

  const getChecklistStats = (task) => {
    const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
    const total = checklist.length;
    const completed = checklist.filter((item) => item?.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    let status = 'todo';
    if (total > 0) {
      status = completed === total ? 'done' : 'doing';
    }
    return { total, completed, percent, hasChecklist: total > 0, status };
  };

  const viewTask = useMemo(() => {
    if (!viewTaskId) return null;
    return safeTasks.find((task) => task.id === viewTaskId) || null;
  }, [safeTasks, viewTaskId]);

  const resolveStatus = (task) => {
    const checklistInfo = getChecklistStats(task);
    if (checklistInfo.hasChecklist) return checklistInfo.status;

    const personalStatus = task?.myStatus ? normalizeTaskStatus(task.myStatus) : null;
    const globalStatus = task?.status ? normalizeTaskStatus(task.status) : null;

    if (personalStatus === 'done' || globalStatus === 'done') {
      return 'done';
    }

    return personalStatus || globalStatus || 'todo';
  };

  const getEffectiveStatus = (task) => {
    const normalized = resolveStatus(task);
    if (normalized === 'done') return 'done';

    if (task?.deadline) {
      const deadlineDate = new Date(task.deadline);
      if (!Number.isNaN(deadlineDate) && deadlineDate < new Date()) {
        return 'doing';
      }
    }
    return normalized;
  };

  const filterTasks = (query) => {
    if (!query) {
      setFilteredTasks(safeTasks);
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = personalTasks.filter((task) => {
      const effective = getEffectiveStatus(task);
      return (
        task.name?.toLowerCase().includes(normalizedQuery) ||
        task.description?.toLowerCase().includes(normalizedQuery) ||
        (task.deadline ? String(task.deadline).toLowerCase().includes(normalizedQuery) : false) ||
        effective.includes(normalizedQuery) ||
        resolveStatus(task).includes(normalizedQuery)
      );
    });

    setFilteredTasks(filtered);
  };

  const groupedTasks = useMemo(() => {
    const grouped = STATUS_COLUMNS.reduce((acc, column) => ({ ...acc, [column.key]: [] }), {});

    filteredTasks.forEach((task) => {
      const columnKey = getEffectiveStatus(task);
      if (!grouped[columnKey]) {
        grouped[columnKey] = [];
      }
      grouped[columnKey].push(task);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = grouped[key].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aDeadline - bDeadline;
      });
    });

    return grouped;
  }, [filteredTasks]);

  // Sync status once on mount when tasks load
  useEffect(() => {
    let synced = false;
    safeTasks.forEach((task) => {
      if (!task?.id) return;
      const checklistInfo = getChecklistStats(task);
      const currentStatus = normalizeTaskStatus(task?.status);

      if (!checklistInfo.hasChecklist) {
        if (currentStatus !== 'todo') {
          changeTaskStatus(task.id, 'todo', { silent: true });
          synced = true;
        }
        return;
      }

      if (checklistInfo.status !== currentStatus) {
        changeTaskStatus(task.id, checklistInfo.status, { silent: true });
        synced = true;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const todo = groupedTasks.todo?.length || 0;
    const doing = groupedTasks.doing?.length || 0;
    const done = groupedTasks.done?.length || 0;
    const total = todo + doing + done;
    return { todo, doing, done, total };
  }, [groupedTasks]);

  const openViewTask = (task) => {
    setViewTaskId(task.id);
  };

  const closeViewTask = () => {
    setViewTaskId(null);
  };

  const assignmentTokens = viewTask ? getAssignmentTokens(viewTask) : [];
  const modalTask = viewTask ? { ...viewTask, status: getEffectiveStatus(viewTask) } : null;
  const modalAssignees =
    assignmentTokens.length > 0 ? assignmentTokens.map((token) => token.label) : [user?.name || 'You'];
  const detailAssignmentOptions = viewTask ? buildChecklistAssigneeOptions(viewTask) : [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            {viewMode === 'board' ? 'Active board' : 'List view'}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
          <p className="mt-1 text-sm text-slate-600">
            {viewMode === 'board'
              ? 'Drag-free kanban overview of your tasks'
              : 'Detailed list with filtering and sorting'}
          </p>
        </div>
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {viewMode === 'board' && safeTasks.length > 0 && <Filter onSearch={filterTasks} />}
          <button
            onClick={() => setViewMode((prev) => (prev === 'board' ? 'list' : 'board'))}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:text-primary shadow-sm transition-colors"
            type="button"
            title={viewMode === 'board' ? 'Switch to List view' : 'Switch to Board view'}
          >
            {viewMode === 'board' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            {viewMode === 'board' ? 'List view' : 'Board view'}
          </button>
        </div>
      </div>

      {/* Stats Overview - only task status counts */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'To Do', value: stats.todo, className: 'from-blue-500 to-indigo-500' },
          { label: 'In Progress', value: stats.doing, className: 'from-emerald-500 to-green-500' },
          { label: 'Done', value: stats.done, className: 'from-fuchsia-500 to-violet-500' },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl px-4 py-4 text-white shadow-sm bg-gradient-to-r ${item.className}`}
          >
            <p className="text-sm text-white/90">{item.label}</p>
            <p className="text-4xl font-bold mt-1 leading-tight">{item.value}</p>
          </div>
        ))}
      </section>

      {viewMode === 'board' ? (
        <>
          {/* Kanban Board */}
          <div className="flex-1 min-h-0">
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Task Board</h2>
                  <p className="text-sm text-slate-500">
                    Tap the action button to move tasks forward
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  {stats.total} assigned task{stats.total !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="flex-1 px-2 sm:px-3 lg:px-4 py-6 overflow-auto">
                <div className="h-full grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
                  {STATUS_COLUMNS.map((column) => {
                    const columnTasks = groupedTasks[column.key] || [];
                    const ColumnIcon = column.icon;

                    return (
                      <div
                        key={column.key}
                        className="bg-slate-50 border border-slate-100 rounded-2xl flex flex-col"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                              <ColumnIcon className="w-4 h-4" />
                              {column.title}
                            </p>
                            <p className="text-xs text-slate-400">{columnTasks.length} tasks</p>
                          </div>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              column.key === 'todo'
                                ? 'bg-slate-400'
                                : column.key === 'doing'
                                ? 'bg-blue-500'
                                : 'bg-primary'
                            }`}
                          />
                        </div>

                        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto max-h-[600px]">
                          {columnTasks.length === 0 && (
                            <div className="text-center text-sm text-slate-400 py-10 flex flex-col items-center gap-3">
                              <ClipboardList className="w-8 h-8 text-slate-300" />
                              <span>No tasks here yet</span>
                            </div>
                          )}

                          {columnTasks.map((task) => {
                            const statusKey = getEffectiveStatus(task);
                            const priorityMeta = getPriorityMeta(task.priority);
                            const checklistInfo = getChecklistStats(task);
                            const progress = checklistInfo.hasChecklist ? checklistInfo.percent : 0;
                            const isLate =
                              resolveStatus(task) !== 'done' &&
                              task.deadline &&
                              new Date(task.deadline) < new Date();

                            return (
                              <div key={task.id}>
                                <div
                                  className={`w-full bg-white border-l-4 rounded-2xl shadow-sm flex flex-col ${
                                    column.borderClass
                                  } ${task.isPinned ? 'ring-2 ring-amber-200' : 'border-slate-100'}`}
                                >
                                  <div className="p-3 space-y-3 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">
                                          #{task.id?.slice(-4) || 'TASK'}
                                        </p>
                                        <h3 className="text-base font-semibold text-slate-900 leading-snug">
                                          {task.name}
                                        </h3>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => togglePinTask(task.id)}
                                          className={`p-2 rounded-full border border-transparent hover:border-amber-100 hover:bg-amber-50 ${
                                            task.isPinned ? 'text-amber-600' : 'text-slate-500'
                                          }`}
                                          type="button"
                                          disabled={actionLoading}
                                        >
                                          <Flag
                                            className={`w-4 h-4 ${task.isPinned ? 'fill-current' : ''}`}
                                          />
                                        </button>
                                        <button
                                          onClick={() => openViewTask(task)}
                                          className="p-2 rounded-full border border-transparent hover:border-blue-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                                          type="button"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <p className="text-sm text-slate-600 min-h-[2.5rem] line-clamp-2">
                                      {task.description || 'No description provided.'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityMeta.chipClass}`}
                                      >
                                        Priority: {priorityMeta.label}
                                      </span>
                                      {isLate && (
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                          Overdue
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                        <span>Progress</span>
                                        <span>
                                          {checklistInfo.completed}/{checklistInfo.total || 0} completed • {progress}%
                                        </span>
                                      </div>
                                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className={`${column.progressColor} h-full rounded-full transition-all`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-slate-500">
                                      <div
                                        className={`flex items-center gap-2 ${
                                          isLate ? 'text-red-500 font-semibold' : ''
                                        }`}
                                      >
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                          {task.deadline ? formatDate(task.deadline) : 'No due date'}
                                        </span>
                                      </div>
                                      <span className="text-xs text-slate-400">
                                        Updated{' '}
                                        {task.updatedAt ? formatDate(task.updatedAt) : 'recently'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="px-4 pb-4 text-center text-sm text-slate-500">
                                    {checklistInfo.hasChecklist
                                      ? 'Progress is based on checklist completion'
                                      : 'No checklist yet'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Task Details Modal */}
          {viewTask && (
            <TaskDetailsModal
              task={modalTask}
              assignees={modalAssignees}
              assignmentOptions={detailAssignmentOptions}
              onClose={closeViewTask}
            />
          )}
        </>
      ) : (
        <TaskListView
          embedded
          tasksOverride={personalTasks}
          employeesOverride={employeeList}
          teamsOverride={teamList}
        />
      )}
    </div>
  );
};

export default MyTasksPage;

