import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ListChecks,
  Calendar,
  Filter as FilterIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Eye,
  Send,
  Users,
  Building2,
  User,
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import { formatDate } from '../../utils/formatDate';
import { isAdmin, isManager } from '../../utils/roleUtils';
import axios from '../../libs/axios';
import { toast } from 'react-hot-toast';

const ChecklistPage = () => {
  const { user } = useUserStore();
  const { tasks, getAllTasks, toggleChecklistItem, loading } = useTaskStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [urgentModalOpen, setUrgentModalOpen] = useState(null); // { itemId, taskId }
  const [urgentReason, setUrgentReason] = useState('');
  const [sendingUrgent, setSendingUrgent] = useState(false);

  const employeeMap = useMemo(() => {
    if (!Array.isArray(employees)) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      acc[emp._id] = emp;
      return acc;
    }, {});
  }, [employees]);

  const teamMap = useMemo(() => {
    if (!Array.isArray(teams)) return {};
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      acc[team._id] = team;
      return acc;
    }, {});
  }, [teams]);

  const userDepartment = user?.department || '';

  const departmentMembers = useMemo(() => {
    if (!isManager(user) || !userDepartment) return [];
    return (employees || [])
      .filter((emp) => (emp.department || '').toLowerCase() === userDepartment.toLowerCase())
      .map((emp) => emp.id || emp._id)
      .filter(Boolean)
      .map(String);
  }, [employees, user, userDepartment]);

  const departmentTeamIds = useMemo(() => {
    if (!isManager(user) || !userDepartment) return [];
    return (teams || [])
      .filter((team) => (team.department || '').toLowerCase() === userDepartment.toLowerCase())
      .map((team) => String(team.id || team._id));
  }, [teams, user, userDepartment]);

  // Group checklist items by task (filtered per role)
  const tasksWithChecklists = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    const scopedTasks = tasks.filter((task) => {
      if (!Array.isArray(task.checklist) || task.checklist.length === 0) return false;

      if (isAdmin(user)) return true;
      if (isManager(user) && userDepartment) {
        const taskAssignedToDeptMembers =
          Array.isArray(task.assignedTo) &&
          task.assignedTo.some((id) => departmentMembers.includes(String(id)));

        const taskAssignedToDeptTeams =
          Array.isArray(task.assignedTeams) &&
          task.assignedTeams.some((team) => {
            const teamId = String(team?.id || team?._id || team);
            if (departmentTeamIds.includes(teamId)) return true;
            const teamObj = teams.find((t) => String(t.id || t._id) === teamId);
            return teamObj && (teamObj.department || '').toLowerCase() === userDepartment.toLowerCase();
          });

        return taskAssignedToDeptMembers || taskAssignedToDeptTeams;
      }
      return false;
    });

    return scopedTasks
      .map((task) => ({
        ...task,
        checklistItems: task.checklist.map((item) => ({
          ...item,
          taskId: task.id,
          taskName: task.name,
          taskDeadline: task.deadline,
          taskPriority: task.priority,
        })),
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [tasks, user, userDepartment, departmentMembers, departmentTeamIds, teams]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasksWithChecklists;

    // Filter by status
    if (filterStatus === 'completed') {
      filtered = filtered.map((task) => ({
        ...task,
        checklistItems: task.checklistItems.filter((item) => item.completed),
      })).filter((task) => task.checklistItems.length > 0);
    } else if (filterStatus === 'pending') {
      filtered = filtered.map((task) => ({
        ...task,
        checklistItems: task.checklistItems.filter((item) => !item.completed),
      })).filter((task) => task.checklistItems.length > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered
        .map((task) => ({
          ...task,
          checklistItems: task.checklistItems.filter(
            (item) =>
              item.title?.toLowerCase().includes(query) ||
              task.name?.toLowerCase().includes(query)
          ),
        }))
        .filter((task) => task.checklistItems.length > 0);
    }

    return filtered;
  }, [tasksWithChecklists, filterStatus, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const allItems = tasksWithChecklists.flatMap((task) => task.checklistItems);
    const total = allItems.length;
    const completed = allItems.filter((item) => item.completed).length;
    const pending = total - completed;

    const today = new Date();
    const overdue = allItems.filter((item) => {
      if (item.completed || !item.dueDate) return false;
      return new Date(item.dueDate) < today;
    }).length;

    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, pending, overdue, completionRate };
  }, [tasksWithChecklists]);

  useEffect(() => {
    if (isAdmin(user) || isManager(user)) {
      getAllTasks();
    }
    getAllUsers();
    getAllTeams();
  }, [user, getAllTasks, getAllUsers, getAllTeams]);

  const handleToggle = async (item) => {
    if (togglingId) return;

    try {
      setTogglingId(item.id);
      await toggleChecklistItem(item.taskId, item.id, !item.completed);
    } finally {
      setTogglingId(null);
    }
  };

  const openTaskDetails = (taskId) => {
    setSelectedTaskId(taskId);
  };

  const closeTaskDetails = () => {
    setSelectedTaskId(null);
  };

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !Array.isArray(tasks)) return null;
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const getAssignmentTokens = (task) => {
    if (!task) return [];
    const tokens = [];

    if (Array.isArray(task.assignedTeams)) {
      task.assignedTeams.forEach((team) => {
        tokens.push({ label: team.name, type: 'team', id: team.id || team._id });
      });
    }

    if (Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach((userId) => {
        const emp = employeeMap[userId];
        if (emp) {
          tokens.push({ label: emp.name, type: 'employee', id: emp.id || emp._id });
        }
      });
    }

    return tokens;
  };

  const getAssigneeLabel = (assignedTo) => {
    if (!assignedTo) return 'Unassigned';
    const emp = employeeMap[assignedTo];
    return emp ? emp.name : 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'high' || p === 'critical') return 'text-red-600 bg-red-50';
    if (p === 'medium') return 'text-orange-600 bg-orange-50';
    return 'text-blue-600 bg-blue-50';
  };

  // Get department from task assignments
  const getTaskDepartment = (task) => {
    if (!task || !Array.isArray(task.assignedTo)) return null;
    
    // Find first assigned employee's department
    for (const userId of task.assignedTo) {
      const emp = employeeMap[userId];
      if (emp && emp.department) {
        return emp.department;
      }
    }
    
    // Check teams
    if (Array.isArray(task.assignedTeams)) {
      for (const team of task.assignedTeams) {
        const teamObj = teamMap[team.id || team._id];
        if (teamObj && teamObj.department) {
          return teamObj.department;
        }
      }
    }
    
    return null;
  };

  // Send urgent notification
  const handleSendUrgent = async () => {
    if (!urgentModalOpen || !urgentReason.trim()) {
      toast.error('Please provide a reason for the urgent request');
      return;
    }

    try {
      setSendingUrgent(true);
      
      // Find the checklist item
      const task = tasks.find((t) => t.id === urgentModalOpen.taskId);
      if (!task) {
        toast.error('Task not found');
        return;
      }

      const checklistItem = task.checklist?.find((item) => item.id === urgentModalOpen.itemId);
      if (!checklistItem) {
        toast.error('Checklist item not found');
        return;
      }

      // Determine recipients
      const recipients = [];
      
      // If assigned to a user, send to that user
      if (checklistItem.assignedTo) {
        recipients.push({ type: 'user', id: checklistItem.assignedTo });
      }
      
      // Also send to task assignees
      if (Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach((userId) => {
          if (!recipients.find((r) => r.type === 'user' && r.id === userId)) {
            recipients.push({ type: 'user', id: userId });
          }
        });
      }
      
      // Send to teams
      if (Array.isArray(task.assignedTeams)) {
        task.assignedTeams.forEach((team) => {
          recipients.push({ type: 'team', id: team.id || team._id });
        });
      }
      
      // Send to department
      const department = getTaskDepartment(task);
      if (department) {
        recipients.push({ type: 'department', name: department });
      }

      // Send notification
      await axios.post('/tasks/notifications/send-urgent', {
        checklistItemId: checklistItem.id,
        taskId: task.id,
        taskName: task.name,
        checklistItemTitle: checklistItem.title,
        reason: urgentReason.trim(),
        recipients,
      });

      toast.success('Urgent notification sent successfully');
      setUrgentModalOpen(null);
      setUrgentReason('');
    } catch (error) {
      console.error('Error sending urgent notification:', error);
      toast.error(error.response?.data?.error || 'Failed to send urgent notification');
    } finally {
      setSendingUrgent(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!isAdmin(user) && !isManager(user)) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary items-center justify-center">
        <p className="text-lg text-text-secondary">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">All Projects</p>
        <h1 className="text-3xl font-bold text-slate-900">Checklist</h1>
        <p className="mt-1 text-sm text-slate-600">
          View and manage all checklist items across all tasks and projects
        </p>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Items" 
          value={stats.total} 
          subtitle={`${stats.total} ${stats.total === 1 ? 'item' : 'items'}`}
          icon={ListChecks}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Completed" 
          value={stats.completed} 
          subtitle={`${stats.completed} ${stats.completed === 1 ? 'item' : 'items'} done`}
          icon={CheckCircle2}
          iconColor="bg-primary-light text-primary"
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          subtitle={`${stats.pending} ${stats.pending === 1 ? 'item' : 'items'} in progress`}
          icon={Clock}
          iconColor="bg-primary-100 text-primary-600"
        />
        <StatCard 
          title="Overdue" 
          value={stats.overdue} 
          subtitle={`${stats.overdue} ${stats.overdue === 1 ? 'item' : 'items'} overdue`}
          icon={AlertCircle}
          iconColor="bg-red-100 text-red-600"
        />
      </section>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search checklist items or tasks..."
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
            <option value="all">All Items</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks with Checklists */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
            <ListChecks className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-600">No checklist items found</p>
            <p className="text-sm text-slate-500 mt-2">
              {searchQuery.trim() ? 'Try adjusting your search or filters' : 'No tasks with checklist items yet'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const department = getTaskDepartment(task);
            const completedCount = task.checklistItems.filter((item) => item.completed).length;
            const totalCount = task.checklistItems.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Task Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">{task.name}</h3>
                        {task.taskPriority && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(
                              task.taskPriority
                            )}`}
                          >
                            {task.taskPriority}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        {department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {department}
                          </span>
                        )}
                        {task.taskDeadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due: {formatDate(task.taskDeadline)}
                          </span>
                        )}
                        <button
                          onClick={() => openTaskDetails(task.id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Task
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Progress</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {completedCount}/{totalCount}
                      </p>
                      <div className="w-24 h-2 bg-slate-200 rounded-full mt-2">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="p-6 space-y-3">
                  {task.checklistItems.map((item) => {
                    const isOverdue =
                      !item.completed && item.dueDate && new Date(item.dueDate) < new Date();

                    return (
                      <div
                        key={`${item.taskId}-${item.id}`}
                        className={`rounded-xl border p-4 ${
                          item.completed ? 'border-primary/30 bg-primary-light/30' : 'border-slate-100 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            disabled={togglingId === item.id}
                            className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 ${
                              item.completed
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-300 text-transparent hover:border-primary hover:bg-primary-light'
                            } ${
                              togglingId === item.id ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium mb-2 ${
                                item.completed
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-900'
                              }`}
                            >
                              {item.title}
                            </p>

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              {item.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">Assigned:</span>{' '}
                                  {getAssigneeLabel(item.assignedTo)}
                                </span>
                              )}

                              {item.dueDate && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    isOverdue ? 'text-red-600 font-semibold' : ''
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  Due: {formatDate(item.dueDate)}
                                  {isOverdue && ' (Overdue)'}
                                </span>
                              )}

                              {item.completed && item.completedAt && (
                                <span className="flex items-center gap-1 text-primary">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Completed {formatDate(item.completedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Urgent Button */}
                          {!item.completed && (
                            <button
                              onClick={() => setUrgentModalOpen({ itemId: item.id, taskId: task.id })}
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Urgent
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Urgent Notification Modal */}
      {urgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Send Urgent Notification</h3>
              <p className="text-sm text-text-secondary mt-1">Notify assignees about urgent checklist item</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={urgentReason}
                  onChange={(e) => setUrgentReason(e.target.value)}
                  placeholder="Enter the reason for urgent request..."
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm min-h-[100px] resize-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Recipients:</strong> This notification will be sent to the assigned staff member, 
                  task assignees, team members, and the department.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
              <button
                onClick={() => {
                  setUrgentModalOpen(null);
                  setUrgentReason('');
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendUrgent}
                disabled={sendingUrgent || !urgentReason.trim()}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingUrgent ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          assignees={getAssignmentTokens(selectedTask).map((t) => t.label)}
          assignmentOptions={[]}
          onClose={closeTaskDetails}
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

export default ChecklistPage;
