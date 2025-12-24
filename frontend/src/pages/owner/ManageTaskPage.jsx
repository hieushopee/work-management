import { useEffect, useMemo, useState } from 'react';
import {
  CirclePlusIcon,
  SquarePenIcon,
  Trash2Icon,
  ArrowUpDown,
  ClipboardList,
  Calendar,
  User,
  Eye,
  Circle,
  PlayCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  Activity,
  UserX,
  UserCheck,
  AlertCircle,
  Star,
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import useUserStore from '../../stores/useUserStore';
import TaskForm from '../../components/TaskForm';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import { formatDate } from '../../utils/formatDate';
import Filter from '../../components/Filter';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import TaskListView from '../task/TaskListView';
import {
  STATUS_COLUMNS,
  getPriorityMeta,
  normalizeTaskStatus,
} from '../../utils/taskBoardConfig';

const SORT_OPTIONS = [
  { label: 'Deadline', value: 'deadline' },
  { label: 'Task Name', value: 'name' },
  { label: 'Status', value: 'status' },
  { label: 'Assignee', value: 'assignedTo' },
];

const ManageTaskPage = () => {
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const { user } = useUserStore();
  const {
    tasks,
    getAllTasks,
    createTask,
    updateTask,
    deleteTask,
    changeTaskStatus,
    loading,
    actionLoading,
  } = useTaskStore();

  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const teamList = useMemo(() => (Array.isArray(teams) ? teams : []), [teams]);

  const [isOpen, setIsOpen] = useState({ type: 'create', open: false });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'deadline', direction: 'ascending' });
  const [viewMode, setViewMode] = useState('board');

  const employeeMap = useMemo(() => {
    if (employeeList.length === 0) return {};
    return employeeList.reduce((acc, employee) => {
      acc[employee.id] = employee;
      acc[employee._id] = employee;
      return acc;
    }, {});
  }, [employeeList]);

  const currentUserId = user?.id;
  const isAdminUser = (user?.role || '').toLowerCase() === 'admin';
  const isManagerUser = (user?.role || '').toLowerCase() === 'manager';
  const managerDept = user?.department;

  const belongsToManagerDept = useMemo(
    () => (task) => {
      if (!managerDept) return false;

      const teamMatch = Array.isArray(task.assignedTeams)
        ? task.assignedTeams.some((team) => {
            const teamId = team?.id || team?._id || team;
            const teamInfo = teamList.find((t) => t.id === teamId || t._id === teamId);
            return teamInfo?.department && teamInfo.department === managerDept;
          })
        : false;

      const userMatch = Array.isArray(task.assignedTo)
        ? task.assignedTo.some((uid) => {
            const emp = employeeMap[uid];
            return emp?.department && emp.department === managerDept;
          })
        : false;

      return teamMatch || userMatch;
    },
    [employeeMap, managerDept, teamList]
  );

  const scopedTasks = useMemo(() => {
    if (isAdminUser) return safeTasks;
    if (isManagerUser) {
      return safeTasks.filter((task) => belongsToManagerDept(task));
    }
    return safeTasks;
  }, [belongsToManagerDept, isAdminUser, isManagerUser, safeTasks]);

  const normalizeRole = (role) => String(role || '').toLowerCase().trim();

  const canModifyTask = (task) => {
    if (isAdminUser) return true;
    if (isManagerUser && currentUserId) {
      return task?.createdBy && task.createdBy.toString() === currentUserId.toString();
    }
    return false;
  };

  const getAssignmentTokens = (task) => {
    if (!task?.assignedTo) return [];

    if (Array.isArray(task.assignedTo)) {
      const rawAssignments = task.assignedTo;

      const normalizeAssignments = (items) => {
        return items.reduce((acc, item) => {
          if (!item) return acc;
          const idValue = item.id || item._id || item.teamId || item.userId || item;
          const id = typeof idValue === 'object' ? idValue?.id || idValue?._id : idValue;
          if (!id) return acc;

          let type = item.type;
          if (!type) {
            if (teamList.some((t) => t.id === id || t._id === id)) {
              type = 'team';
            } else if (employeeList.some((e) => e.id === id || e._id === id)) {
              type = 'employee';
            } else {
              type = 'employee';
            }
          }

          let name = item.name;
          if (!name) {
            if (type === 'team') {
              const t = teamList.find((team) => team.id === id || team._id === id);
              name = t?.name || String(id);
            } else {
              const e = employeeList.find((employee) => employee.id === id || employee._id === id);
              name = e?.name || String(id);
            }
          }

          const key = `${type}:${id}`;
          if (!acc.some((entry) => `${entry.type}:${entry.id}` === key)) {
            acc.push({ type, id, name });
          }
          return acc;
        }, []);
      };

      const assignments = normalizeAssignments(rawAssignments);
      const tokens = [];
      const seen = new Set();
      const selectedTeamIds = new Set();

      const pushToken = (label, key, type, valueId) => {
        if (!label || seen.has(key)) return;
        tokens.push({ label, key, type, id: valueId });
        seen.add(key);
      };

      assignments
        .filter((assignment) => assignment.type === 'team')
        .forEach((teamAssignment) => {
          const teamId = teamAssignment.id || teamAssignment._id || teamAssignment;
          selectedTeamIds.add(teamId);
          pushToken(teamAssignment.name || String(teamId), `team:${teamId}`, 'team', teamId);
        });

      const employeeBelongsToSelectedTeam = (employeeId) => {
        if (!employeeId || selectedTeamIds.size === 0) return false;
        const employeeInfo = employeeList.find((emp) => emp.id === employeeId || emp._id === employeeId);
        const employeeTeamList = employeeInfo?.teams || [];
        return employeeTeamList.some((teamInfo) => {
          const tId = teamInfo?.id || teamInfo?._id || teamInfo;
          return selectedTeamIds.has(tId);
        });
      };

      assignments
        .filter((assignment) => assignment.type !== 'team')
        .forEach((assignment) => {
          const employeeId = assignment.id || assignment._id || assignment;
          if (employeeBelongsToSelectedTeam(employeeId)) return;
          const label = employeeMap[employeeId]?.name || assignment.name || String(employeeId);
          pushToken(label, `employee:${employeeId}`, 'employee', employeeId);
        });

      if (tokens.length === 0 && assignments.length > 0) {
        const fallbackAssignment = assignments[0];
        const fallbackId =
          fallbackAssignment?.id ||
          fallbackAssignment?._id ||
          fallbackAssignment?.userId ||
          fallbackAssignment?.teamId ||
          fallbackAssignment;
        const fallbackName =
          assignments[0]?.name ||
          employeeList.find((emp) => emp.id === assignments[0]?.id || emp._id === assignments[0]?.id)?.name ||
          'Assignee';
        pushToken(fallbackName, `fallback:${fallbackId || 'unknown'}`, 'employee', fallbackId || undefined);
      }

      return tokens;
    }

    const employee = employeeMap[task.assignedTo];
    return employee ? [{ type: 'employee', label: employee.name, key: `employee:${task.assignedTo}` }] : [];
  };

  const renderAssignedTo = (task) => {
    const tokens = getAssignmentTokens(task);
    if (tokens.length === 0) {
      return (
        <span className="px-3 py-1 rounded-full font-medium text-xs bg-bg-hover text-text-secondary">
          Unassigned
        </span>
      );
    }

    const [firstToken, ...rest] = tokens;
    const extraCount = rest.length;

    return (
      <div className="flex items-center gap-2">
        {firstToken && (
          <span
            className={`px-3 py-1 rounded-full font-medium text-xs ${
              firstToken.type === 'team' ? 'bg-blue-100 text-blue-600' : 'bg-bg-hover text-text-secondary'
            }`}
          >
            {firstToken.label}
          </span>
        )}
        {extraCount > 0 && (
          <span className="px-2 py-1 rounded-full font-medium text-xs bg-bg-hover text-text-secondary">
            +{extraCount}
          </span>
        )}
      </div>
    );
  };

  const getAssigneeNames = (task) => getAssignmentTokens(task).map((token) => token.label);
  const buildChecklistAssigneeOptions = (task) => {
    if (!task) return [];
    const options = [];
    const seen = new Set();
    const tokens = getAssignmentTokens(task);

    const addOption = (id, label) => {
      const normalizedId =
        typeof id === 'string' ? id : id?.toString?.();
      if (!normalizedId || seen.has(normalizedId)) return;
      seen.add(normalizedId);
      options.push({ id: normalizedId, label });
    };

    tokens.forEach((token) => {
      if (token.type === 'employee') {
        const id = token.id || token.key?.split(':')[1];
        const employee = id ? employeeMap[id] : null;
        addOption(id, employee?.name || token.label || id);
      } else if (token.type === 'team') {
        const team = teamList.find((t) => t.id === token.id || t._id === token.id);
        const members = Array.isArray(team?.members) ? team.members : [];
        members.forEach((member) => {
          const memberIdValue =
            (typeof member === 'object'
              ? member?.id || member?._id || member?.userId || member
              : member) ?? null;
          const normalizedId =
            typeof memberIdValue === 'string'
              ? memberIdValue
              : memberIdValue?.toString?.();
          if (!normalizedId) return;
          const employee =
            employeeMap[normalizedId] ||
            employeeList.find(
              (emp) => emp.id === normalizedId || emp._id === normalizedId
            );
          addOption(normalizedId, employee?.name || employee?.email || normalizedId);
        });
      }
    });

    const teamIdSet = new Set(
      (Array.isArray(teamList) ? teamList : [])
        .map((team) => {
          const raw = team?.id || team?._id;
          if (!raw) return null;
          return typeof raw === 'string' ? raw : raw.toString();
        })
        .filter(Boolean)
    );

    return options
      .filter((option) => option.label && option.label !== option.id)
      .filter((option) => !teamIdSet.has(option.id));
  };

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

  const getAggregateStatus = (task) => {
    const checklistInfo = getChecklistStats(task);
    if (checklistInfo.hasChecklist) {
      return checklistInfo.status;
    }

    const entries = Array.isArray(task?.assigneeStatuses) ? task.assigneeStatuses : [];
    if (entries.length === 0) {
      return normalizeTaskStatus(task?.status);
    }

    const employeeStatuses = entries
      .filter((entry) => normalizeRole(entry.role) === 'employee')
      .map((entry) => normalizeTaskStatus(entry.status));

    const relevant = employeeStatuses.length > 0 ? employeeStatuses : entries.map((entry) => normalizeTaskStatus(entry.status));

    if (relevant.every((status) => status === 'done')) return 'done';
    if (relevant.some((status) => status === 'doing')) return 'doing';
    return 'todo';
  };

  const filterTasks = (query) => {
    if (!query) {
      setFilteredTasks(scopedTasks);
      return;
    }

    const lowercasedQuery = query.trim().toLowerCase();
    const filtered = scopedTasks.filter((task) => {
      let assignedToNames = '';
      if (Array.isArray(task.assignedTo)) {
        assignedToNames = task.assignedTo
          .map((assignment) => {
            if (assignment?.type === 'employee') {
              return employeeMap[assignment.id]?.name;
            }
            const teamMatch = teamList.find((team) => team.id === assignment.id || team._id === assignment.id);
            return assignment?.name || teamMatch?.name;
          })
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
      } else {
        assignedToNames = employeeMap[task.assignedTo]?.name?.toLowerCase() || '';
      }

      const name = (task.name || '').toLowerCase();
      const description = (task.description || '').toLowerCase();
      const deadlineValue = task.deadline ? String(task.deadline).toLowerCase() : '';

      return (
        name.includes(lowercasedQuery) ||
        description.includes(lowercasedQuery) ||
        deadlineValue.includes(lowercasedQuery) ||
        getAggregateStatus(task).includes(lowercasedQuery) ||
        assignedToNames.includes(lowercasedQuery)
      );
    });
    setFilteredTasks(filtered);
  };

  const sortedTasks = useMemo(() => {
    const sortableItems = [...filteredTasks];
    if (!sortConfig) return sortableItems;

    sortableItems.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'assignedTo') {
        const getNames = (task) => {
          if (Array.isArray(task.assignedTo)) {
            return task.assignedTo
              .map((assignment) => (assignment.type === 'employee' ? employeeMap[assignment.id]?.name : assignment.name))
              .filter(Boolean)
              .join(', ');
          }
          return employeeMap[task.assignedTo]?.name || '';
        };
        aValue = getNames(a);
        bValue = getNames(b);
      }

      if (sortConfig.key === 'status') {
        aValue = getAggregateStatus(a);
        bValue = getAggregateStatus(b);
      }

      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return sortableItems;
  }, [filteredTasks, sortConfig, employeeMap]);

  const tasksByStatus = useMemo(() => {
    const grouped = STATUS_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: [] }), {});
    sortedTasks.forEach((task) => {
      const key = normalizeTaskStatus(getAggregateStatus(task));
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(task);
    });
    return grouped;
  }, [sortedTasks]);

  const isFullyAssigned = (task) => {
    const hasAssignee = Array.isArray(task.assignedTo)
      ? task.assignedTo.length > 0
      : Boolean(task.assignedTo);
    const hasDeadline = Boolean(task.deadline);
    return hasAssignee && hasDeadline;
  };

  const stats = useMemo(() => {
    const today = new Date();
    const overdue = sortedTasks.filter((task) => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate < today && getAggregateStatus(task) !== 'done';
    }).length;

    const unassigned = sortedTasks.filter((task) => !isFullyAssigned(task)).length;

    return {
      total: sortedTasks.length,
      unassigned,
      assigned: sortedTasks.length - unassigned,
      overdue,
      highPriority: sortedTasks.filter((task) => {
        const priority = String(task.priority || '').toLowerCase();
        return priority === 'high' || priority === 'critical';
      }).length,
    };
  }, [sortedTasks]);

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' };
      }
      return { key, direction: 'ascending' };
    });
  };

  useEffect(() => {
    setFilteredTasks(scopedTasks);
  }, [scopedTasks]);

  // Sync status once on mount when tasks load
  useEffect(() => {
    safeTasks.forEach((task) => {
      const checklistInfo = getChecklistStats(task);
      if (!checklistInfo.hasChecklist || !task?.id) return;
      const derivedStatus = checklistInfo.status;
      const currentStatus = normalizeTaskStatus(task?.status);
      if (derivedStatus && derivedStatus !== currentStatus) {
        changeTaskStatus(task.id, derivedStatus, { silent: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return safeTasks.find((task) => task.id === selectedTaskId) || null;
  }, [safeTasks, selectedTaskId]);

  useEffect(() => {
    getAllTasks();
    getAllUsers();
    getAllTeams();
  }, [getAllTasks, getAllUsers, getAllTeams]);

  const onEditClick = (task) => {
    setSelectedTaskId(task.id);
    setIsOpen({ type: 'edit', open: true });
  };

  const onDeleteClick = (task) => {
    setSelectedTaskId(task.id);
    setIsOpen({ type: 'delete', open: true });
  };

  const onCreateClick = () => {
    setSelectedTaskId(null);
    setIsOpen({ type: 'create', open: true });
  };

  const onViewClick = (task) => {
    setSelectedTaskId(task.id);
    setIsOpen({ type: 'view', open: true });
  };

  const onTaskFormSubmit = async (taskData) => {
    if (isOpen.type === 'create') {
      await createTask(taskData);
    } else if (isOpen.type === 'edit' && selectedTaskId) {
      await updateTask(selectedTaskId, taskData);
    }
    setSelectedTaskId(null);
    setIsOpen({ type: 'create', open: false });
  };

  const onDeleteTask = async () => {
    if (isOpen.type === 'delete' && selectedTaskId) {
      await deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      setIsOpen({ type: 'create', open: false });
    }
  };

  if (loading) return <LoadingSpinner />;

  const detailTask = selectedTask
    ? { ...selectedTask, status: getAggregateStatus(selectedTask) }
    : null;
  const detailAssignmentOptions = selectedTask ? buildChecklistAssigneeOptions(selectedTask) : [];

  return (
    <div className="bg-slate-50 min-h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col px-2 sm:px-4 lg:px-6 w-full gap-6 pb-6">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Manage Tasks</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Filter onSearch={filterTasks} />
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode((prev) => (prev === 'board' ? 'list' : 'board'))}
                  className="border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600 transition-all duration-200 px-3 py-2 rounded-xl cursor-pointer shadow inline-flex items-center gap-2"
                  type="button"
                  title={viewMode === 'board' ? 'Switch to List view' : 'Switch to Board view'}
                >
                  {viewMode === 'board' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </button>
                <button
                  onClick={onCreateClick}
                  className="bg-blue-600 flex items-center justify-center gap-2 text-white hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded-xl cursor-pointer shadow-lg hover:shadow-xl"
                  type="button"
                >
                  <CirclePlusIcon className="w-5 h-5" />
                  Create Task
                </button>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard 
              title="Total Tasks" 
              value={stats.total} 
              subtitle={`${stats.total} ${stats.total === 1 ? 'task' : 'tasks'}`}
              icon={Activity}
              iconColor="bg-blue-100 text-blue-600"
            />
            <StatCard 
              title="Unassigned" 
              value={stats.unassigned} 
              subtitle={`${stats.unassigned} ${stats.unassigned === 1 ? 'task' : 'tasks'} unassigned`}
              icon={UserX}
              iconColor="bg-primary-100 text-primary-600"
            />
            <StatCard 
              title="Assigned" 
              value={stats.assigned} 
              subtitle={`${stats.assigned} ${stats.assigned === 1 ? 'task' : 'tasks'} assigned`}
              icon={UserCheck}
              iconColor="bg-green-100 text-green-600"
            />
            <StatCard 
              title="Overdue" 
              value={stats.overdue} 
              subtitle={`${stats.overdue} ${stats.overdue === 1 ? 'task' : 'tasks'} overdue`}
              icon={AlertCircle}
              iconColor="bg-red-100 text-red-600"
            />
            <StatCard 
              title="High Priority" 
              value={stats.highPriority} 
              subtitle={`${stats.highPriority} ${stats.highPriority === 1 ? 'task' : 'tasks'} high priority`}
              icon={Star}
              iconColor="bg-purple-100 text-purple-600"
            />
          </section>

          <div className="flex-1 min-h-0">
            {viewMode === 'board' ? (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col flex-1 min-h-[720px]">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Active board</h2>
                    <p className="text-sm text-slate-500">Drag-free kanban overview of every task</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Sort by</span>
                      <select
                        value={sortConfig.key}
                        onChange={(e) => setSortConfig((prev) => ({
                          key: e.target.value,
                          direction: prev.key === e.target.value ? prev.direction : 'ascending',
                        }))}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => requestSort(sortConfig.key)}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-400"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      {sortConfig.direction === 'ascending' ? 'Asc' : 'Desc'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 px-2 sm:px-3 lg:px-4 py-6">
                  <div className="h-full grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                    {STATUS_COLUMNS.map((column) => {
                      const columnTasks = tasksByStatus[column.key] || [];
                      return (
                        <div
                          key={column.key}
                          className="bg-slate-50 border border-slate-100 rounded-2xl flex flex-col h-full"
                        >
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{column.title}</p>
                              <p className="text-xs text-slate-400">{columnTasks.length} tasks</p>
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                column.key === 'todo'
                                  ? 'bg-slate-400'
                                  : column.key === 'doing'
                                  ? 'bg-blue-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-h-0 px-4 py-4 space-y-4">
                            {columnTasks.length === 0 && (
                              <div className="text-center text-sm text-slate-400 py-10">
                                No tasks in this column
                              </div>
                            )}
                            {columnTasks.map((task) => {
                              const { percent } = getChecklistStats(task);
                              const statusKey = getAggregateStatus(task);
                              const priorityMeta = getPriorityMeta(task.priority);
                              const progress = percent;
                              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && statusKey !== 'done';
                              const allowModify = canModifyTask(task);

                              return (
                                <div key={task.id}>
                                  <div
                                    className={`w-full bg-white border-l-4 rounded-2xl shadow-sm hover:shadow-lg transition-shadow ${column.borderClass}`}
                                  >
                                    <div className="p-3 space-y-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs uppercase tracking-wider text-slate-400">#{task.id?.slice(-4) || 'TASK'}</p>
                                          <h3 className="text-base font-semibold text-slate-900 leading-snug">{task.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => onViewClick(task)}
                                            className="p-2 rounded-full border border-transparent hover:border-blue-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                                            type="button"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => onEditClick(task)}
                                            className="p-2 rounded-full border border-transparent hover:border-blue-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 disabled:opacity-50"
                                            type="button"
                                            disabled={!allowModify}
                                            title={allowModify ? 'Edit task' : 'Only creator/admin can edit'}
                                          >
                                            <SquarePenIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => onDeleteClick(task)}
                                            className="p-2 rounded-full border border-transparent hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-50"
                                            type="button"
                                            disabled={!allowModify}
                                            title={allowModify ? 'Delete task' : 'Only creator/admin can delete'}
                                          >
                                            <Trash2Icon className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <p className="text-sm text-slate-600 min-h-[2.5rem]">
                                        {task.description || 'No description provided.'}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityMeta.chipClass}`}>
                                          Priority: {priorityMeta.label}
                                        </span>
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                          <span>Progress</span>
                                          <span>{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className={`${column.progressColor} h-full rounded-full`} style={{ width: `${progress}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
                                            {task.deadline ? formatDate(task.deadline) : 'No due date'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <User className="w-4 h-4" />
                                          {renderAssignedTo(task)}
                                        </div>
                                      </div>
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
            ) : (
              <TaskListView
                embedded
                tasksOverride={scopedTasks}
                employeesOverride={employeeList}
                teamsOverride={teamList}
              />
            )}
          </div>
        </div>
      </div>

      {isOpen.open && ['create', 'edit'].includes(isOpen.type) && (
        <TaskForm
          setIsOpen={setIsOpen}
          type={isOpen.type}
          task={selectedTask}
          employees={employees}
          isLoading={actionLoading}
          onSubmit={onTaskFormSubmit}
        />
      )}

      {isOpen.open && isOpen.type === 'view' && detailTask && (
        <TaskDetailsModal
          task={detailTask}
          assignees={selectedTask ? getAssigneeNames(selectedTask) : []}
          assignmentOptions={detailAssignmentOptions}
          onClose={() => {
            setSelectedTaskId(null);
            setIsOpen({ type: 'create', open: false });
          }}
        />
      )}

      {isOpen.type === 'delete' && (
        <DeleteConfirmation
          setIsOpen={setIsOpen}
          onDelete={onDeleteTask}
          loading={actionLoading}
          itemName={selectedTask?.name || 'Task'}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, iconColor }) => (
  <div className="rounded-xl p-5 bg-white border border-border-light shadow-soft flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-text-secondary mb-1">{title}</p>
      <p className="text-3xl font-semibold text-text-main mb-1">{value}</p>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
    {Icon && (
      <div className={`w-12 h-12 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0 ml-4`}>
        <Icon className="w-6 h-6" />
      </div>
    )}
  </div>
);

export default ManageTaskPage;

