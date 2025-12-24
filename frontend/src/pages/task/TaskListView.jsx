import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  User,
  Download,
  ArrowUpDown,
  CircleUserRoundIcon,
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import TaskForm from '../../components/TaskForm';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import { formatDate } from '../../utils/formatDate';
import { normalizeTaskStatus, getPriorityMeta } from '../../utils/taskBoardConfig';
import { hasOwnerPermissions } from '../../utils/roleUtils';

const TaskListView = ({ embedded = false, tasksOverride, employeesOverride, teamsOverride }) => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const {
    tasks,
    getAllTasks,
    getTasksByUserId,
    createTask,
    updateTask,
    deleteTask,
    loading,
    actionLoading,
  } = useTaskStore();

  const isOwner = hasOwnerPermissions(user);

  const safeTasks = useMemo(
    () => (Array.isArray(tasksOverride) ? tasksOverride : Array.isArray(tasks) ? tasks : []),
    [tasksOverride, tasks]
  );
  const employeeList = useMemo(
    () => (Array.isArray(employeesOverride) ? employeesOverride : Array.isArray(employees) ? employees : []),
    [employeesOverride, employees]
  );
  const teamList = useMemo(
    () => (Array.isArray(teamsOverride) ? teamsOverride : Array.isArray(teams) ? teams : []),
    [teamsOverride, teams]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'deadline', direction: 'asc' });
  const [isOpen, setIsOpen] = useState({ type: 'create', open: false });
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const employeeMap = useMemo(() => {
    if (employeeList.length === 0) return {};
    return employeeList.reduce((acc, employee) => {
      acc[employee.id] = employee;
      acc[employee._id] = employee;
      return acc;
    }, {});
  }, [employeeList]);

  const getAssignmentTokens = (task) => {
    if (!task?.assignedTo) return [];

    if (Array.isArray(task.assignedTo)) {
      const tokens = [];
      const seen = new Set();

      const pushToken = (label, key, type, valueId) => {
        if (!label || seen.has(key)) return;
        tokens.push({ label, key, type, id: valueId });
        seen.add(key);
      };

      // Add teams
      if (Array.isArray(task.assignedTeams)) {
        task.assignedTeams.forEach((team) => {
          const teamId = team.id || team._id;
          if (teamId) {
            const teamObj = teamList.find((t) => t.id === teamId || t._id === teamId);
            pushToken(teamObj?.name || String(teamId), `team:${teamId}`, 'team', teamId);
          }
        });
      }

      // Add employees
      task.assignedTo.forEach((userId) => {
        const employee = employeeMap[userId];
        if (employee) {
          pushToken(employee.name, `employee:${userId}`, 'employee', userId);
        }
      });

      return tokens;
    }

    const employee = employeeMap[task.assignedTo];
    return employee
      ? [{ type: 'employee', label: employee.name, key: `employee:${task.assignedTo}` }]
      : [];
  };

  const renderAssignedTo = (task) => {
    const tokens = getAssignmentTokens(task);
    if (tokens.length === 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <User className="w-3.5 h-3.5" />
          <span>Unassigned</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {tokens.slice(0, 2).map((token, index) => {
          if (token.type === 'team') {
            // For teams, show colored badge with initials
            return (
              <div
                key={index}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-blue-500"
              >
                {token.label.slice(0, 2).toUpperCase()}
              </div>
            );
          }
          
          // For employees, show avatar if available
          const employee = token.id ? employeeMap[token.id] : null;
          const avatar = employee?.avatar;
          const initials = token.label.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          
          if (avatar) {
            return (
              <img
                key={index}
                src={avatar}
                alt={token.label}
                className="w-6 h-6 rounded-full object-cover border-2 border-white"
              />
            );
          }
          
          // Fallback: show initials on orange background
          return (
            <div
              key={index}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-primary"
            >
              {initials}
            </div>
          );
        })}
        {tokens.length > 2 && (
          <span className="text-xs text-text-secondary">+{tokens.length - 2}</span>
        )}
      </div>
    );
  };

  const getChecklistStats = (task) => {
    const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
    const total = checklist.length;
    const completed = checklist.filter((item) => item?.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  };

  const getAggregateStatus = (task) => {
    const checklistInfo = getChecklistStats(task);
    if (checklistInfo.total > 0) {
      if (checklistInfo.completed === checklistInfo.total) return 'done';
      // Has checklist but not fully completed -> always in progress
      return 'doing';
    }

    return normalizeTaskStatus(task?.status || 'todo');
  };

  const filteredTasks = useMemo(() => {
    return safeTasks.filter((task) => {
      const matchesSearch =
        task.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const taskStatus = getAggregateStatus(task);
      const matchesStatus = filterStatus === 'all' || taskStatus === filterStatus;

      const taskPriority = String(task.priority || 'Medium').toLowerCase();
      const matchesPriority =
        filterPriority === 'all' || taskPriority === filterPriority.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [safeTasks, searchQuery, filterStatus, filterPriority]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'name') {
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
      } else if (sortConfig.key === 'status') {
        aValue = getAggregateStatus(a);
        bValue = getAggregateStatus(b);
      } else if (sortConfig.key === 'priority') {
        const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        aValue = priorityOrder[String(a.priority || 'medium').toLowerCase()] || 2;
        bValue = priorityOrder[String(b.priority || 'medium').toLowerCase()] || 2;
      } else if (sortConfig.key === 'deadline') {
        aValue = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        bValue = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTasks, sortConfig]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'todo':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-bg-hover text-text-main">
            To Do
          </span>
        );
      case 'doing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            In Progress
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Done
          </span>
        );
      default:
        return null;
    }
  };

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return safeTasks.find((task) => task.id === selectedTaskId) || null;
  }, [safeTasks, selectedTaskId]);

  useEffect(() => {
    if (embedded) return;
    if (isOwner) {
      getAllTasks();
    } else if (user?.id) {
      getTasksByUserId(user.id);
    }
    getAllUsers();
    getAllTeams();
  }, [embedded, isOwner, user?.id, getAllTasks, getTasksByUserId, getAllUsers, getAllTeams]);

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
    if (embedded) return;
    if (isOpen.type === 'create') {
      await createTask(taskData);
    } else if (isOpen.type === 'edit' && selectedTaskId) {
      await updateTask(selectedTaskId, taskData);
    }
    setSelectedTaskId(null);
    setIsOpen({ type: 'create', open: false });
  };

  const handleExport = () => {
    if (!safeTasks.length) return;
    const headers = ['Task Code', 'Task Name', 'Status', 'Priority', 'Assignees', 'Progress (%)', 'Deadline'];
    const rows = safeTasks.map((task) => {
      const status = getAggregateStatus(task);
      const priority = String(task.priority || '').toUpperCase() || 'MEDIUM';
      const assignees = getAssignmentTokens(task).map((t) => t.label).join('; ');
      const progress = getChecklistStats(task).percent;
      const deadline = task.deadline ? formatDate(task.deadline) : 'No deadline';
      return [
        task.id || '',
        (task.name || '').replace(/,/g, ' '),
        status,
        priority,
        assignees.replace(/,/g, ';'),
        progress,
        deadline,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onDeleteTask = async () => {
    if (isOpen.type === 'delete' && selectedTaskId) {
      await deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      setIsOpen({ type: 'create', open: false });
    }
  };

  // Remove legacy duplicate handler

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) return <LoadingSpinner />;

  const detailTask = selectedTask
    ? { ...selectedTask, status: getAggregateStatus(selectedTask) }
    : null;
  const detailAssignmentTokens = selectedTask ? getAssignmentTokens(selectedTask) : [];
  const detailAssignees = detailAssignmentTokens.map((token) => token.label);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-text-main mb-1">Task List View</h1>
          <p className="text-text-secondary">
            Detailed list of all tasks with advanced filtering ({filteredTasks.length} tasks)
          </p>
        </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-border-light text-text-main px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-bg-secondary transition-colors"
              type="button"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {!embedded && isOwner && (
              <button
                onClick={onCreateClick}
                className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-text-main transition-colors"
                type="button"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
            )}
          </div>
        </div>

      <div className="bg-white rounded-2xl shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 p-6 border-b border-border-light">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              placeholder="Search by task name, description, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-text-main placeholder:text-text-muted focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="doing">In Progress</option>
            <option value="done">Done</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Tasks Table */}
        <div className="overflow-auto w-full flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => requestSort('name')}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    Task Code
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => requestSort('name')}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    Task Name
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => requestSort('status')}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => requestSort('priority')}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    Priority
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Progress</th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => requestSort('deadline')}
                    className="flex items-center gap-1 hover:text-slate-700"
                  >
                    Deadline
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-secondary">
                    No tasks found
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => {
                  const { percent } = getChecklistStats(task);
                  const statusKey = getAggregateStatus(task);
                  const priorityMeta = getPriorityMeta(task.priority);

                  return (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-text-main">
                          #{task.id?.slice(-6) || 'TASK'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-text-main">{task.name}</div>
                          <div className="text-xs text-text-secondary line-clamp-1">
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(statusKey)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityMeta.chipClass}`}>
                          {priorityMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{renderAssignedTo(task)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                statusKey === 'done' ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-text-main">
                          <Calendar className="w-3.5 h-3.5 text-text-muted" />
                          <span>
                            {task.deadline ? formatDate(task.deadline) : 'No deadline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onViewClick(task)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-text-secondary" />
                          </button>
                          {isOwner && (
                            <>
                              <button
                                onClick={() => onEditClick(task)}
                                className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-text-secondary" />
                              </button>
                              <button
                                onClick={() => onDeleteClick(task)}
                                className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isOwner && isOpen.open && ['create', 'edit'].includes(isOpen.type) && (
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
          assignees={detailAssignees}
          assignmentOptions={[]}
          onClose={() => {
            setSelectedTaskId(null);
            setIsOpen({ type: 'create', open: false });
          }}
        />
      )}

      {isOwner && isOpen.type === 'delete' && (
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

export default TaskListView;
