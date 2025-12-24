import { useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Activity,
  ClipboardList,
  CircleUserRoundIcon,
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { normalizeTaskStatus } from '../../utils/taskBoardConfig';
import { hasOwnerPermissions } from '../../utils/roleUtils';

const TaskAnalytics = () => {
  const { user } = useUserStore();
  const { tasks, getAllTasks, getTasksByUserId, loading } = useTaskStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();

  const isOwner = hasOwnerPermissions(user);

  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const teamList = useMemo(() => (Array.isArray(teams) ? teams : []), [teams]);

  const employeeMap = useMemo(() => {
    if (employeeList.length === 0) return {};
    return employeeList.reduce((acc, employee) => {
      acc[employee.id] = employee;
      acc[employee._id] = employee;
      return acc;
    }, {});
  }, [employeeList]);

  const getChecklistStats = (task) => {
    const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
    const total = checklist.length;
    const completed = checklist.filter((item) => item?.completed).length;
    return { total, completed };
  };

  const getStatusFromAssignees = (task) => {
    const assignees = Array.isArray(task?.assigneeStatuses) ? task.assigneeStatuses : [];
    if (assignees.length === 0) return null;

    // Prioritize latest update per user
    const latestMap = new Map();
    assignees.forEach((entry) => {
      const userId = entry?.user || entry?.userId || entry?._id;
      if (!userId) return;
      const normalizedStatus = normalizeTaskStatus(entry.status);
      const role = String(entry.role || '').toLowerCase();
      const updatedAt = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
      const existing = latestMap.get(userId);
      if (!existing || updatedAt > existing.updatedAt) {
        latestMap.set(userId, { status: normalizedStatus, role, updatedAt });
      }
    });

    const entries = Array.from(latestMap.values());
    const staffStatuses = entries.filter((entry) => entry.role === 'staff').map((entry) => entry.status);
    const relevant = staffStatuses.length > 0 ? staffStatuses : entries.map((entry) => entry.status);

    if (relevant.some((s) => s === 'doing')) return 'doing';
    if (relevant.some((s) => s === 'done')) return 'done';
    if (relevant.some((s) => s === 'todo')) return 'todo';
    return null;
  };

  const getAggregateStatus = (task) => {
    // 1) Checklist rules dominate: any checklist => doing, only done when all checked
    const checklistInfo = getChecklistStats(task);
    if (checklistInfo.total > 0) {
      if (checklistInfo.completed === checklistInfo.total) return 'done';
      return 'doing';
    }

    // 2) Then assigneeStatuses (latest per user)
    const assigneeStatus = getStatusFromAssignees(task);
    if (assigneeStatus) return assigneeStatus;

    // 3) Finally, use task.status
    return normalizeTaskStatus(task?.status || 'todo');
  };

  const stats = useMemo(() => {
    const totalTasks = safeTasks.length;
    const completedTasks = safeTasks.filter((task) => getAggregateStatus(task) === 'done').length;
    const inProgressTasks = safeTasks.filter((task) => getAggregateStatus(task) === 'doing').length;
    const todoTasks = safeTasks.filter((task) => getAggregateStatus(task) === 'todo').length;

    const today = new Date();
    const overdueTask = safeTasks.filter((task) => {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      return deadlineDate < today && getAggregateStatus(task) !== 'done';
    }).length;

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const highPriorityTasks = safeTasks.filter((task) => {
      const priority = String(task.priority || '').toLowerCase();
      return priority === 'high' || priority === 'critical';
    }).length;

    // Calculate average completion time (mock for now)
    const averageCompletionTime = 4.5;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTask,
      completionRate,
      averageCompletionTime,
      highPriorityTasks,
    };
  }, [safeTasks]);

  const tasksByStatus = useMemo(() => {
    return [
      {
        status: 'Done',
        count: stats.completedTasks,
        color: 'bg-green-500',
        showPercent: false,
      },
      {
        status: 'In Progress',
        count: stats.inProgressTasks,
        color: 'bg-blue-500',
        showPercent: false,
      },
      {
        status: 'To Do',
        count: stats.todoTasks,
        color: 'bg-gray-400',
        showPercent: false,
      },
    ];
  }, [stats]);

  const tasksByPriority = useMemo(() => {
    if (safeTasks.length === 0) return [];

    const highCount = safeTasks.filter(
      (t) => String(t.priority || '').toLowerCase() === 'high'
    ).length;
    const mediumCount = safeTasks.filter(
      (t) => String(t.priority || '').toLowerCase() === 'medium'
    ).length;
    const lowCount = safeTasks.filter(
      (t) => String(t.priority || '').toLowerCase() === 'low'
    ).length;

    return [
      {
        priority: 'High',
        count: highCount,
        color: 'bg-red-500',
      },
      {
        priority: 'Medium',
        count: mediumCount,
        color: 'bg-orange-500',
      },
      {
        priority: 'Low',
        count: lowCount,
        color: 'bg-blue-500',
      },
    ];
  }, [safeTasks]);

  const maxPriorityCount = useMemo(() => {
    if (!Array.isArray(tasksByPriority) || tasksByPriority.length === 0) return 0;
    return Math.max(...tasksByPriority.map((item) => item.count));
  }, [tasksByPriority]);

  const teamPerformance = useMemo(() => {
    if (!isOwner || teamList.length === 0) return [];

    return teamList.map((team) => {
      const teamTasks = safeTasks.filter((task) => {
        if (Array.isArray(task.assignedTeams)) {
          return task.assignedTeams.some((t) => (t.id || t._id) === (team.id || team._id));
        }
        return false;
      });

      const completed = teamTasks.filter((task) => getAggregateStatus(task) === 'done').length;
      const total = teamTasks.length;
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        name: team.name,
        completed,
        total,
        rate,
      };
    });
  }, [isOwner, teamList, safeTasks]);

  const topPerformers = useMemo(() => {
    if (!isOwner || employeeList.length === 0) return [];

    const employeeStats = employeeList.map((employee) => {
      const employeeTasks = safeTasks.filter((task) => {
        if (Array.isArray(task.assignedTo)) {
          return task.assignedTo.some((id) => id === employee.id || id === employee._id);
        }
        return task.assignedTo === employee.id || task.assignedTo === employee._id;
      });

      const completed = employeeTasks.filter((task) => getAggregateStatus(task) === 'done').length;
      const inProgress = employeeTasks.filter((task) => getAggregateStatus(task) === 'doing').length;

      return {
        name: employee.name,
        avatar: employee.avatar,
        code: employee.email?.split('@')[0]?.slice(0, 3).toUpperCase() || 'EMP',
        completed,
        inProgress,
        total: employeeTasks.length,
      };
    });

    // Sort by completed tasks
    return employeeStats.sort((a, b) => b.completed - a.completed).slice(0, 4);
  }, [isOwner, employeeList, safeTasks]);

  const recentActivity = useMemo(() => {
    const activities = [];

    // Get recent completed tasks
    const recentCompleted = safeTasks
      .filter((task) => getAggregateStatus(task) === 'done')
      .slice(0, 2)
      .map((task) => ({
        action: 'Task completed',
        task: task.name,
        user: Array.isArray(task.assignedTo) && task.assignedTo.length > 0
          ? employeeMap[task.assignedTo[0]]?.name || 'Unknown'
          : 'Unknown',
        time: task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Recently',
      }));

    // Get overdue tasks
    const today = new Date();
    const overdueTasks = safeTasks
      .filter((task) => {
        if (!task.deadline) return false;
        const deadlineDate = new Date(task.deadline);
        return deadlineDate < today && getAggregateStatus(task) !== 'done';
      })
      .slice(0, 2)
      .map((task) => ({
        action: 'Task overdue',
        task: task.name,
        user: Array.isArray(task.assignedTo) && task.assignedTo.length > 0
          ? employeeMap[task.assignedTo[0]]?.name || 'Unknown'
          : 'Unknown',
        time: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Unknown',
      }));

    activities.push(...recentCompleted, ...overdueTasks);

    return activities.slice(0, 4);
  }, [safeTasks, employeeMap]);

  useEffect(() => {
    if (isOwner) {
      getAllTasks();
      getAllTeams();
    } else if (user?.id) {
      getTasksByUserId(user.id);
    }
    getAllUsers();
  }, [isOwner, user?.id, getAllTasks, getTasksByUserId, getAllUsers, getAllTeams]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      <div className="mb-6">
        <h1 className="text-text-main mb-1">Analytics & Reports</h1>
        <p className="text-text-secondary">
          Comprehensive insights into task performance and team productivity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Tasks" 
          value={stats.totalTasks} 
          subtitle="Overall task count"
          icon={Activity}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Completed" 
          value={stats.completedTasks} 
          subtitle={`${stats.completionRate}% completion rate`}
          icon={CheckCircle2}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Avg. Completion Time" 
          value={`${stats.averageCompletionTime} days`} 
          subtitle="Estimated average"
          icon={Clock}
          iconColor="bg-primary-100 text-primary-600"
        />
        <StatCard 
          title="Overdue Tasks" 
          value={stats.overdueTask} 
          subtitle="Needs attention"
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Tasks by Status */}
        <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-text-main font-semibold">Tasks by Status</h3>
              <p className="text-sm text-text-secondary">Distribution across workflow stages</p>
            </div>
          </div>

      <div className="space-y-4">
        {tasksByStatus.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-main font-medium">{item.status}</span>
              <span className="text-sm text-text-main font-semibold">{item.count} tasks</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.count > 0 ? 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

          <div className="mt-6 pt-6 border-t border-border-light">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Completion Rate</span>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-text-main font-semibold">Tasks by Priority</h3>
              <p className="text-sm text-text-secondary">Priority level distribution</p>
            </div>
          </div>

          <div className="space-y-4">
            {tasksByPriority.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-main font-medium">{item.priority} Priority</span>
                  <span className="text-sm text-text-main font-semibold">{item.count} tasks</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${item.color}`}
                    style={{
                      width:
                        item.count === 0
                          ? '0%'
                          : `${maxPriorityCount ? Math.max((item.count / maxPriorityCount) * 100, 4) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border-light">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">High Priority Tasks</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  {stats.highPriorityTasks} tasks
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance (Owner Only) */}
      {isOwner && teamPerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-text-main font-semibold">Team Performance</h3>
              <p className="text-sm text-text-secondary">Task completion rates by team</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left py-3 px-4">Team Name</th>
                  <th className="text-left py-3 px-4">Completed</th>
                  <th className="text-left py-3 px-4">Total Tasks</th>
                  <th className="text-left py-3 px-4">Completion Rate</th>
                  <th className="text-left py-3 px-4">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamPerformance.map((team, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-text-main font-medium">{team.name}</td>
                    <td className="py-3 px-4 text-text-main">{team.completed}</td>
                    <td className="py-3 px-4 text-text-main">{team.total}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          team.rate >= 70
                            ? 'bg-green-100 text-green-700'
                            : team.rate >= 50
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {team.rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              team.rate >= 70
                                ? 'bg-green-500'
                                : team.rate >= 50
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${team.rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Performers (Owner Only) */}
        {isOwner && topPerformers.length > 0 && (
          <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-text-main font-semibold">Top Performers</h3>
                <p className="text-sm text-text-secondary">Most productive team members</p>
              </div>
            </div>

            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {performer.avatar ? (
                      <img
                        src={performer.avatar}
                        alt={performer.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                        <CircleUserRoundIcon className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-text-main">{performer.name}</div>
                      <div className="text-xs text-text-secondary">{performer.total} total tasks</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">{performer.completed} completed</div>
                    <div className="text-xs text-text-secondary">{performer.inProgress} in progress</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-text-main font-semibold">Recent Activity</h3>
              <p className="text-sm text-text-secondary">Latest task updates</p>
            </div>
          </div>

          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">No recent activity</div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-4 border-b border-border-light last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.action === 'Task completed'
                        ? 'bg-green-500'
                        : activity.action === 'Task assigned'
                        ? 'bg-blue-500'
                        : activity.action === 'Task created'
                        ? 'bg-purple-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-main">{activity.action}</span>
                      <span className="text-xs text-text-secondary">{activity.time}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{activity.task}</p>
                    <p className="text-xs text-text-secondary mt-1">by {activity.user}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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

export default TaskAnalytics;
