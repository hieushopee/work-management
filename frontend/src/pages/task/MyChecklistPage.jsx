import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import { formatDate } from '../../utils/formatDate';
import { isManager, isStaff } from '../../utils/roleUtils';

const MyChecklistPage = () => {
  const { pathname } = useLocation();
  const { user } = useUserStore();
  const { tasks, getTasksByUserId, getAllTasks, toggleChecklistItem, loading } = useTaskStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();

  const isManagerUser = isManager(user);
  const isStaffUser = isStaff(user);
  const userId = user?.id;
  const userDepartment = user?.department || '';
  
  // Check if this is "My Check List" (personal) or "Check List" (department)
  const isMyChecklist = pathname.includes('/my-checklist');

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const employeeMap = useMemo(() => {
    if (!Array.isArray(employees)) return {};
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      acc[emp._id] = emp;
      return acc;
    }, {});
  }, [employees]);

  // Get department members for manager
  const departmentMembers = useMemo(() => {
    if (!isManagerUser || !userDepartment) return [];
    const list = Array.isArray(employees) ? employees : [];
    return list.filter((emp) => 
      (emp.department || '').toLowerCase() === userDepartment.toLowerCase()
    ).map((emp) => emp.id || emp._id);
  }, [isManagerUser, userDepartment, employees]);

  // Get department teams for manager
  const departmentTeamIds = useMemo(() => {
    if (!isManagerUser || !userDepartment) return [];
    const list = Array.isArray(teams) ? teams : [];
    return list.filter((team) => 
      (team.department || '').toLowerCase() === userDepartment.toLowerCase()
    ).map((team) => String(team.id || team._id));
  }, [isManagerUser, userDepartment, teams]);

  useEffect(() => {
    getAllTeams();
  }, [getAllTeams]);

  // Extract all checklist items from all tasks
  const allChecklistItems = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    const items = [];
    tasks.forEach((task) => {
      if (Array.isArray(task.checklist)) {
        task.checklist.forEach((item) => {
          let shouldInclude = false;

          if (isManagerUser) {
            if (isMyChecklist) {
              // "My Check List": Only show checklist items assigned to manager OR created by manager
              const isAssignedToManager = item.assignedTo === userId;
              const isCreatedByManager = item.createdBy === userId;
              shouldInclude = isAssignedToManager || isCreatedByManager;
            } else {
              // "Check List": Show checklist items from tasks assigned to department members/teams
              // Check if task is assigned to department members
              const taskAssignedToDeptMembers = Array.isArray(task.assignedTo) && 
                task.assignedTo.some((id) => departmentMembers.includes(String(id)));
              
              // Check if task is assigned to department teams
              const taskAssignedToDeptTeams = Array.isArray(task.assignedTeams) && 
                task.assignedTeams.some((team) => {
                  const teamId = String(team.id || team._id || team);
                  // Check if team is in department team IDs list
                  if (departmentTeamIds.includes(teamId)) return true;
                  // Also check if team object has department property matching
                  const teamObj = teams.find((t) => String(t.id || t._id) === teamId);
                  if (teamObj && (teamObj.department || '').toLowerCase() === userDepartment.toLowerCase()) {
                    return true;
                  }
                  return false;
                });
              
              const createdByDeptMember =
                task.checklist &&
                task.checklist.some(
                  (entry) =>
                    entry.id === item.id &&
                    entry.createdBy &&
                    departmentMembers.includes(String(entry.createdBy))
                );

              shouldInclude = taskAssignedToDeptMembers || taskAssignedToDeptTeams || createdByDeptMember;
            }
          } else if (isStaffUser) {
            // Staff: show items assigned to them, created by them, or unassigned
            const isAssignedToUser = item.assignedTo === userId;
            const isCreatedByUser = item.createdBy === userId;
            const isUnassigned = !item.assignedTo;
            shouldInclude = isAssignedToUser || isCreatedByUser || isUnassigned;
          }

          if (shouldInclude) {
            items.push({
              ...item,
              taskId: task.id,
              taskName: task.name,
              taskDeadline: task.deadline,
              taskPriority: task.priority,
            });
          }
        });
      }
    });

    return items;
  }, [tasks, isManagerUser, isStaffUser, userId, departmentMembers, departmentTeamIds, isMyChecklist, teams, userDepartment]);

  // Filter checklist items
  const filteredItems = useMemo(() => {
    let filtered = allChecklistItems;

    // Filter by status
    if (filterStatus === 'completed') {
      filtered = filtered.filter((item) => item.completed);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter((item) => !item.completed);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.taskName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allChecklistItems, filterStatus, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allChecklistItems.length;
    const completed = allChecklistItems.filter((item) => item.completed).length;
    const pending = total - completed;

    const today = new Date();
    const overdue = allChecklistItems.filter((item) => {
      if (item.completed || !item.dueDate) return false;
      return new Date(item.dueDate) < today;
    }).length;

    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, pending, overdue, completionRate };
  }, [allChecklistItems]);

  useEffect(() => {
    if (isManagerUser) {
      // Manager: get all tasks to filter by department
      getAllTasks();
    } else if (isStaffUser && userId) {
      // Staff: get only their tasks
      getTasksByUserId(userId);
    }
    getAllUsers();
    getAllTeams();
  }, [isManagerUser, isStaffUser, userId, getAllTasks, getTasksByUserId, getAllUsers, getAllTeams]);

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
        tokens.push({ label: team.name, type: 'team' });
      });
    }

    if (Array.isArray(task.assignedTo)) {
      task.assignedTo.forEach((userId) => {
        const emp = employeeMap[userId];
        if (emp) {
          tokens.push({ label: emp.name, type: 'employee' });
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

  const renderItemCard = (item) => {
    const isOverdue = !item.completed && item.dueDate && new Date(item.dueDate) < new Date();

    return (
      <div
        key={`${item.taskId}-${item.id}`}
        className={`rounded-2xl border p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
          item.completed ? 'border-primary/30 bg-primary-light/30' : 'border-slate-100'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            type="button"
            onClick={() => handleToggle(item)}
            disabled={togglingId === item.id}
            className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 ${
              item.completed
                ? 'border-primary bg-primary text-white'
                : 'border-slate-300 text-transparent hover:border-primary hover:bg-primary-light'
            } ${togglingId === item.id ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
          >
            <Check className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-base font-medium mb-2 ${
                item.completed ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {item.title}
            </p>

            {/* Task Info */}
            <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
              <button
                onClick={() => openTaskDetails(item.taskId)}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                {item.taskName}
              </button>

              {item.taskPriority && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(
                    item.taskPriority
                  )}`}
                >
                  {item.taskPriority}
                </span>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {item.assignedTo && (
                <span className="flex items-center gap-1">
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

              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created by: {item.createdBy && employeeMap[item.createdBy]?.name
                  ? employeeMap[item.createdBy].name
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Task Items</p>
        <h1 className="text-3xl font-bold text-slate-900">
          {isManagerUser && !isMyChecklist ? 'Check List' : 'My Check List'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isManagerUser && !isMyChecklist
            ? 'All checklist items from tasks assigned to your department members and teams'
            : isManagerUser && isMyChecklist
            ? 'Checklist items assigned to you'
            : 'All checklist items across your tasks in one place'}
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
          iconColor="bg-green-100 text-green-600"
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

      {/* Checklist Items */}
      <div className="bg-white rounded-2xl shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            Checklist Items ({filteredItems.length})
          </h2>
          <p className="text-sm text-slate-500">
            Click on items to mark as complete or view task details
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ListChecks className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No checklist items found</p>
              <p className="text-sm">
                {searchQuery.trim() ? 'Try adjusting your search or filters' : 'Start by adding checklist items to your tasks'}
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${isMyChecklist ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {isMyChecklist ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">Checklist assigned by you</h3>
                    {filteredItems
                      .filter((item) => item.createdBy && item.createdBy === userId)
                      .map((item) => renderItemCard(item))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">Checklist assigned to you</h3>
                    {filteredItems
                      .filter((item) => item.assignedTo && item.assignedTo === userId)
                      .map((item) => renderItemCard(item))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => renderItemCard(item))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

export default MyChecklistPage;
