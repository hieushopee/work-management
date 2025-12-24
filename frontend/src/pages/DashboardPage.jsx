import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  Trophy,
  TrendingUp,
  Users,
  Clock,
  X,
  RefreshCw,
} from 'lucide-react';
import axios from '../libs/axios';
import { useTaskStore } from '../stores/useTaskStore';
import useUserStore from '../stores/useUserStore';
import { format, formatDistanceToNow, isSameDay, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { hasOwnerPermissions } from '../utils/roleUtils';
import { fetchLogs } from '../api/attendance';

const badgeStyles = {
  Task: 'bg-blue-50 text-blue-700 border border-blue-200',
  Attendance: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Leaderboard: 'bg-primary-light text-primary border border-primary',
  Message: 'bg-primary-50 text-primary border border-primary-200',
  Member: 'bg-pink-50 text-pink-700 border border-pink-200',
  Form: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  Calendar: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const DashboardPage = () => {
  const { user } = useUserStore();
  const { tasks, getAllTasks, getTasksByUserId, loading: tasksLoading } = useTaskStore();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [hoursRanking, setHoursRanking] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [forms, setForms] = useState([]);
  const [deletionEvents, setDeletionEvents] = useState([]);
  const resourceSnapshotsRef = useRef({
    tasks: new Map(),
    forms: new Map(),
    employees: new Map(),
    events: new Map(),
  });

  useEffect(() => {
    if (!user?.id) return;
    const fetchTasks = async () => {
      if (hasOwnerPermissions(user)) {
        await getAllTasks();
      } else {
        await getTasksByUserId(user.id);
      }
    };
    fetchTasks();
  }, [user?.id, user?.role, getAllTasks, getTasksByUserId, refreshTick]);

  const computeAttendanceAndRanking = useCallback((attendanceLogs, employeeList) => {
    const today = new Date();
    const attendanceSet = new Set();
    const hoursMap = new Map();

    // Process attendance logs from Attendance module
    (Array.isArray(attendanceLogs) ? attendanceLogs : []).forEach((log) => {
      const userId = log?.user?._id || log?.user?.id || log?.user || log?.userId;
        if (!userId) return;

      // Count today's attendance
      const checkinTime = log?.checkin?.time ? new Date(log.checkin.time) : null;
      if (checkinTime && !Number.isNaN(checkinTime.getTime()) && isSameDay(checkinTime, today)) {
        attendanceSet.add(String(userId));
      }

      // Calculate work hours from checkin/checkout times
      if (checkinTime && log?.checkout?.time) {
        const checkoutTime = new Date(log.checkout.time);
        if (!Number.isNaN(checkoutTime.getTime()) && checkoutTime > checkinTime) {
          const minutes = (checkoutTime.getTime() - checkinTime.getTime()) / 60000;
        if (minutes > 0) {
          const key = String(userId);
          hoursMap.set(key, (hoursMap.get(key) || 0) + minutes / 60);
        }
        }
      }
    });

    setAttendanceToday(attendanceSet.size);

    const ranking = Array.from(hoursMap.entries())
      .map(([userId, hours]) => {
        const employee = employeeList.find((emp) => {
          const empId = String(emp.id || emp._id || '');
          return empId === userId;
        });
        return {
          userId,
          name: employee?.name || employee?.email || 'Member',
          role: employee?.role || '',
          hours,
        };
      })
      .sort((a, b) => b.hours - a.hours);

    setHoursRanking(ranking);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/employees/all');
        const list = Array.isArray(data?.users) ? data.users : [];
        setEmployees(list);

        if (list.length) {
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);

          // Get attendance logs from Attendance module instead of Calendar
          const attendanceLogs = await fetchLogs(
            monthStart.toISOString(),
            monthEnd.toISOString(),
            undefined,
            { userIds: list.map((emp) => emp.id || emp._id) }
          );
          const logList = Array.isArray(attendanceLogs) ? attendanceLogs : [];

          // Still get calendar events for other purposes (if needed)
          const params = {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
            members: list.map((emp) => emp.id || emp._id),
          };

          const eventsRes = await axios.get('/calendar', { params });
          const eventList = Array.isArray(eventsRes.data)
            ? eventsRes.data.map((evt) => ({
                ...evt,
                start: evt.start ? new Date(evt.start) : null,
                end: evt.end ? new Date(evt.end) : null,
                createdAt: evt.createdAt ? new Date(evt.createdAt) : null,
                updatedAt: evt.updatedAt ? new Date(evt.updatedAt) : null,
              }))
            : [];

          setCalendarEvents(eventList);
          // Use attendance logs for time tracking calculation
          computeAttendanceAndRanking(logList, list);
        } else {
          setCalendarEvents([]);
          setAttendanceToday(0);
          setHoursRanking([]);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setCalendarEvents([]);
        setAttendanceToday(0);
        setHoursRanking([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [computeAttendanceAndRanking, refreshTick]);

  const taskSummary = useMemo(() => {
    const summary = {
      total: Array.isArray(tasks) ? tasks.length : 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
    };
    if (!Array.isArray(tasks)) return summary;

    const today = new Date();
    tasks.forEach((task) => {
      const status = String(task?.status || '').toLowerCase();
      if (status.includes('done') || status.includes('complete')) summary.done += 1;
      else if (status.includes('progress') || status.includes('doing')) summary.inProgress += 1;
      else summary.todo += 1;

      if (task?.deadline) {
        const deadlineDate = new Date(task.deadline);
        if (deadlineDate < today && !status.includes('done')) {
          summary.overdue += 1;
        }
      }
    });
    return summary;
  }, [tasks]);

  const recentActivities = useMemo(() => {
    if (hasOwnerPermissions(user)) {
      return buildOwnerActivities({
        tasks,
        employees,
        forms,
        calendarEvents,
        deletionEvents,
      });
    }
    return buildMemberActivities({ tasks, calendarEvents, hoursRanking });
  }, [user?.role, tasks, employees, forms, calendarEvents, hoursRanking, deletionEvents]);

  const timeTrackingStats = useMemo(() => {
    const totalHours = hoursRanking.reduce((sum, entry) => sum + entry.hours, 0);
    const average = hoursRanking.length ? totalHours / hoursRanking.length : 0;
    const topPerformer = hoursRanking[0];
    return {
      totalHours,
      average,
      topPerformer,
    };
  }, [hoursRanking]);

  const topTenRanking = useMemo(
    () =>
      hoursRanking
        .filter((entry) => String(entry.role || '').toLowerCase() !== 'owner')
        .slice(0, 10),
    [hoursRanking]
  );
  const overduePercent = taskSummary.total ? Math.min((taskSummary.overdue / taskSummary.total) * 100, 100) : 0;

  useEffect(() => {
    if (!hasOwnerPermissions(user)) {
      setForms([]);
      setDeletionEvents([]);
      resourceSnapshotsRef.current = {
        tasks: new Map(),
        forms: new Map(),
        employees: new Map(),
        events: new Map(),
      };
      return;
    }

    let cancelled = false;
    const fetchForms = async () => {
      try {
        const { data } = await axios.get('/forms');
        if (cancelled) return;
        setForms(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load forms for dashboard:', error);
          setForms([]);
        }
      }
    };

    fetchForms();
    return () => {
      cancelled = true;
    };
  }, [user?.role, refreshTick]);

  const recordDeletions = useCallback((entries) => {
    if (!entries.length) return;
    setDeletionEvents((prev) => {
      const merged = [...entries, ...prev];
      const unique = new Map();
      merged.forEach((entry) => {
        unique.set(entry.id, entry);
      });
      return Array.from(unique.values()).slice(0, 30);
    });
  }, []);

  const syncResourceSnapshot = useCallback(
    (key, items, getMeta, badgeLabel) => {
      if (!hasOwnerPermissions(user)) return;
      const prevMap = resourceSnapshotsRef.current[key] || new Map();
      const nextMap = new Map();
      const removed = [];

      (Array.isArray(items) ? items : []).forEach((item) => {
        const identifier = String(item?.id || item?._id || '');
        if (!identifier) return;
        nextMap.set(identifier, getMeta(item));
      });

      prevMap.forEach((meta, identifier) => {
        if (!nextMap.has(identifier)) {
          removed.push({
            id: `${key}-deleted-${identifier}-${Date.now()}`,
            title: `${badgeLabel} deleted`,
            subtitle: meta?.name || 'Item removed',
            badge: badgeLabel,
            timestamp: Date.now(),
          });
        }
      });

      resourceSnapshotsRef.current[key] = nextMap;
      if (removed.length) {
        recordDeletions(removed);
      }
    },
    [recordDeletions, user?.role]
  );

  useEffect(() => {
    syncResourceSnapshot(
      'tasks',
      tasks,
      (task) => ({ name: task?.name || 'Task' }),
      'Task'
    );
  }, [tasks, syncResourceSnapshot]);

  useEffect(() => {
    syncResourceSnapshot(
      'forms',
      forms,
      (form) => ({ name: form?.title || 'Form' }),
      'Form'
    );
  }, [forms, syncResourceSnapshot]);

  useEffect(() => {
    syncResourceSnapshot(
      'employees',
      employees,
      (employee) => ({ name: employee?.name || employee?.email || 'Member' }),
      'Member'
    );
  }, [employees, syncResourceSnapshot]);

  useEffect(() => {
    syncResourceSnapshot(
      'events',
      calendarEvents,
      (evt) => ({ name: evt?.title || 'Calendar event' }),
      'Calendar'
    );
  }, [calendarEvents, syncResourceSnapshot]);

  const handleLeaderboardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setLeaderboardModalOpen(true);
    }
  };

  return (
    <div className='h-full overflow-y-auto bg-white p-6'>
      {/* Header */}
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-sm text-text-secondary mb-1'>Hello, {user?.name || 'team'} 👋</p>
          <h1 className='text-2xl font-bold text-text-main mb-1'>Dashboard</h1>
          <p className='text-sm text-text-muted'>Overview for {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <button
          type='button'
          onClick={() => setRefreshTick((prev) => prev + 1)}
          className='inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-main shadow-soft transition-all duration-200 hover:bg-bg-hover hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60'
          disabled={loading || tasksLoading}
        >
          <RefreshCw className={`w-4 h-4 ${loading || tasksLoading ? 'animate-spin' : ''}`} />
          {loading || tasksLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        {summaryCards(employees.length, taskSummary, attendanceToday).map((card) => (
          <div key={card.title} className='bg-white rounded-xl border border-border-light p-6 shadow-soft hover:shadow-soft-md transition-shadow duration-200'>
            <div className='flex items-center justify-between mb-4'>
              <p className='text-xs font-semibold text-text-secondary uppercase tracking-wide'>{card.title}</p>
              <div className={`rounded-lg p-2.5 ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <div className='text-3xl font-bold text-text-main mb-1'>{card.value}</div>
            <p className='text-sm text-text-secondary'>{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Left Column - 2 spans */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Task Overview */}
          <div className='bg-white rounded-xl border border-border-light p-6 shadow-soft'>
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h2 className='text-lg font-semibold text-text-main mb-1'>Task Overview</h2>
                <p className='text-sm text-text-secondary'>Progress across all assignments</p>
              </div>
              <TrendingUp className='h-5 w-5 text-text-muted' />
            </div>
            <div className='grid gap-4 md:grid-cols-3 mb-6'>
              <div className='rounded-xl bg-rose-50 p-4 border border-rose-100'>
                <p className='text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2'>To do</p>
                <p className='text-2xl font-bold text-rose-700'>{taskSummary.todo}</p>
              </div>
              <div className='rounded-xl bg-blue-50 p-4 border border-blue-100'>
                <p className='text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2'>In progress</p>
                <p className='text-2xl font-bold text-blue-700'>{taskSummary.inProgress}</p>
              </div>
              <div className='rounded-xl bg-emerald-50 p-4 border border-emerald-100'>
                <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2'>Completed</p>
                <p className='text-2xl font-bold text-emerald-700'>{taskSummary.done}</p>
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Overdue tasks</span>
                <span className='font-semibold text-rose-600'>{taskSummary.overdue}</span>
              </div>
              <div className='h-2.5 rounded-full bg-bg-secondary overflow-hidden'>
                <div
                  className='h-full rounded-full bg-rose-500 transition-all'
                  style={{ width: `${overduePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity & Time Tracking */}
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Recent Activity */}
            <div className='bg-white rounded-xl border border-border-light p-6 shadow-soft'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h2 className='text-lg font-semibold text-text-main mb-1'>Recent Activity</h2>
                  <p className='text-sm text-text-secondary'>Latest updates</p>
                </div>
                <MessageSquare className='h-5 w-5 text-text-muted' />
              </div>
              <div className='max-h-[280px] space-y-3 overflow-y-auto pr-2'>
                {recentActivities.length === 0 ? (
                  <p className='text-sm text-text-secondary text-center py-4'>No recent updates yet.</p>
                ) : (
                  recentActivities.map((item) => (
                    <div key={item.id} className='flex items-start gap-3 rounded-lg bg-bg-secondary p-3 border border-border-light hover:bg-bg-hover transition-colors duration-200'>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 ${badgeStyles[item.badge] || 'bg-bg-hover text-text-secondary border border-border-light'}`}>
                        {item.badge}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-text-main truncate'>{item.title}</p>
                        <p className='text-xs text-text-secondary truncate'>{item.subtitle}</p>
                      </div>
                      <span className='text-xs text-text-muted shrink-0'>{item.timeAgo}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Time Tracking */}
            <div className='bg-white rounded-xl border border-border-light p-6 shadow-soft'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h2 className='text-lg font-semibold text-text-main mb-1'>Time Tracking</h2>
                  <p className='text-sm text-text-secondary'>Shift logs this month</p>
                </div>
                <Clock className='h-5 w-5 text-text-muted' />
              </div>
              <div className='space-y-4'>
                <div>
                  <p className='text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2'>Total tracked hours</p>
                  <p className='text-3xl font-bold text-text-main'>
                    {timeTrackingStats.totalHours.toFixed(1)}h
                  </p>
                </div>
                <div className='rounded-xl bg-bg-secondary p-4 border border-border-light'>
                  <p className='text-xs text-text-secondary mb-1'>Average per member</p>
                  <p className='text-xl font-bold text-text-main'>{timeTrackingStats.average.toFixed(1)}h</p>
                </div>
                {timeTrackingStats.topPerformer && (
                  <div className='rounded-xl bg-emerald-50 p-4 border border-emerald-100'>
                    <p className='text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1'>Top performer</p>
                    <p className='text-sm font-semibold text-text-main'>{timeTrackingStats.topPerformer.name}</p>
                    <p className='text-xs text-text-secondary'>
                      {timeTrackingStats.topPerformer.hours.toFixed(1)}h logged this month
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Leaderboard */}
        <div>
          <div
            role='button'
            tabIndex={0}
            onClick={() => setLeaderboardModalOpen(true)}
            onKeyDown={handleLeaderboardKeyDown}
            className='bg-white rounded-xl border border-border-light p-6 shadow-soft cursor-pointer transition-all duration-200 hover:shadow-soft-md hover:border-primary outline-none focus-visible:ring-2 focus-visible:ring-primary'
          >
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h2 className='text-lg font-semibold text-text-main mb-1'>Leaderboard</h2>
                <p className='text-sm text-text-secondary'>Top 10 by hours</p>
              </div>
              <Trophy className='h-6 w-6 text-yellow-500' />
            </div>
            <div className='space-y-3 mb-4'>
              {topTenRanking.length === 0 ? (
                <p className='text-sm text-text-secondary text-center py-4'>No ranked members yet.</p>
              ) : (
                topTenRanking.map((entry, idx) => (
                  <div key={entry.userId || idx} className='flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors duration-200'>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm font-semibold text-text-muted w-6'>#{idx + 1}</span>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-text-main truncate'>{entry.name}</p>
                        <p className='text-xs text-text-secondary truncate'>{entry.role || 'Member'}</p>
                      </div>
                    </div>
                    <span className='text-sm font-semibold text-text-main'>{entry.hours.toFixed(1)}h</span>
                  </div>
                ))
              )}
            </div>
            <p className='text-center text-sm font-semibold text-primary pt-3 border-t border-border-light'>Click to view full ranking</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {leaderboardModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10' onClick={() => setLeaderboardModalOpen(false)}>
          <div className='w-full max-w-3xl rounded-2xl border border-border-light bg-white p-6 shadow-soft-xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-start justify-between gap-3 mb-4'>
              <div>
                <p className='text-xs font-semibold text-primary uppercase tracking-wide mb-1'>Leaderboard</p>
                <h3 className='text-2xl font-bold text-text-main mb-1'>Full Ranking</h3>
                <p className='text-sm text-text-secondary'>Ordered by total working hours this month</p>
              </div>
              <button
                type='button'
                onClick={() => setLeaderboardModalOpen(false)}
                className='rounded-lg border border-border-light p-2 text-text-muted transition-colors duration-200 hover:border-border-medium hover:text-text-main hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
            <div className='max-h-[60vh] overflow-y-auto divide-y divide-border-light'>
              {hoursRanking.length === 0 ? (
                <p className='py-6 text-center text-sm text-text-secondary'>No data available.</p>
              ) : (
                hoursRanking.map((entry, idx) => (
                  <div key={entry.userId || idx} className='flex items-center justify-between gap-4 py-3 hover:bg-bg-hover transition-colors duration-200'>
                    <div className='flex items-center gap-4'>
                      <span className='text-base font-semibold text-text-muted w-8'>#{idx + 1}</span>
                      <div>
                        <p className='text-sm font-semibold text-text-main'>{entry.name}</p>
                        <p className='text-xs text-text-secondary'>{entry.role || 'Member'}</p>
                      </div>
                    </div>
                    <span className='text-sm font-semibold text-text-main'>{entry.hours.toFixed(2)}h</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const summaryCards = (employeeCount, taskSummary, attendanceToday) => [
  {
    title: 'Total Users',
    value: employeeCount,
    subtitle: 'Workspace members',
    icon: <Users className='h-5 w-5' />,
    iconBg: 'bg-primary-light text-primary',
  },
  {
    title: 'Total Tasks',
    value: taskSummary.total,
    subtitle: 'Across all projects',
    icon: <ClipboardList className='h-5 w-5' />,
    iconBg: 'bg-green-50 text-green-600',
  },
  {
    title: 'Attendance Today',
    value: attendanceToday,
    subtitle: 'Checked-in members',
    icon: <CalendarCheck className='h-5 w-5' />,
    iconBg: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Active Tasks',
    value: taskSummary.inProgress,
    subtitle: 'Currently in progress',
    icon: <Activity className='h-5 w-5' />,
    iconBg: 'bg-amber-50 text-amber-600',
  },
];

export default DashboardPage;

const OWNER_ACTIVITY_WINDOW_DAYS = 30;

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildOwnerActivities = ({ tasks, employees, forms, calendarEvents, deletionEvents }) => {
  const threshold = subDays(new Date(), OWNER_ACTIVITY_WINDOW_DAYS).getTime();
  const bucket = [];

  const pushEntry = ({ id, title, subtitle, timestamp, badge }) => {
    const date = parseDateValue(timestamp);
    if (!date) return;
    const timeValue = date.getTime();
    if (timeValue < threshold) return;
    bucket.push({
      id,
      title,
      subtitle,
      badge,
      timestamp: timeValue,
    });
  };

  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const created = parseDateValue(task?.createdAt);
    if (created) {
      pushEntry({
        id: `task-create-${task.id}`,
        title: 'Task added',
        subtitle: task?.name || 'Untitled task',
        timestamp: created,
        badge: 'Task',
      });
    }
    const updated = parseDateValue(task?.updatedAt);
    if (updated && (!created || Math.abs(updated.getTime() - created.getTime()) > 60000)) {
      pushEntry({
        id: `task-update-${task.id}`,
        title: 'Task updated',
        subtitle: task?.name || 'Untitled task',
        timestamp: updated,
        badge: 'Task',
      });
    }
  });

  (Array.isArray(forms) ? forms : []).forEach((form) => {
    const created = parseDateValue(form?.createdAt);
    if (created) {
      pushEntry({
        id: `form-create-${form.id}`,
        title: 'Form created',
        subtitle: form?.title || 'Untitled form',
        timestamp: created,
        badge: 'Form',
      });
    }
    const updated = parseDateValue(form?.updatedAt);
    if (updated && (!created || Math.abs(updated.getTime() - created.getTime()) > 60000)) {
      pushEntry({
        id: `form-update-${form.id}`,
        title: 'Form updated',
        subtitle: form?.title || 'Untitled form',
        timestamp: updated,
        badge: 'Form',
      });
    }
  });

  (Array.isArray(employees) ? employees : []).forEach((member) => {
    const created = parseDateValue(member?.createdAt);
    if (created) {
      pushEntry({
        id: `member-create-${member.id}`,
        title: 'Member added',
        subtitle: member?.name || member?.email || 'New member',
        timestamp: created,
        badge: 'Member',
      });
    }
    const updated = parseDateValue(member?.updatedAt);
    if (updated && (!created || Math.abs(updated.getTime() - created.getTime()) > 60000)) {
      pushEntry({
        id: `member-update-${member.id}`,
        title: 'Member updated',
        subtitle: member?.name || member?.email || 'Member details changed',
        timestamp: updated,
        badge: 'Member',
      });
    }
  });

  (Array.isArray(calendarEvents) ? calendarEvents : []).forEach((evt) => {
    const created = parseDateValue(evt?.createdAt || evt?.start);
    if (created) {
      pushEntry({
        id: `calendar-create-${evt.id}`,
        title: 'Calendar event added',
        subtitle: evt?.title || 'Untitled event',
        timestamp: created,
        badge: 'Calendar',
      });
    }
    const updated = parseDateValue(evt?.updatedAt);
    if (updated && (!created || Math.abs(updated.getTime() - created.getTime()) > 60000)) {
      pushEntry({
        id: `calendar-update-${evt.id}`,
        title: 'Calendar event updated',
        subtitle: evt?.title || 'Untitled event',
        timestamp: updated,
        badge: 'Calendar',
      });
    }

    (Array.isArray(evt?.attendance) ? evt.attendance : [])
      .filter((entry) => entry?.success)
      .slice(0, 2)
      .forEach((entry, idx) => {
        pushEntry({
          id: `attendance-${evt.id}-${entry?.userId || idx}-${entry?.at || idx}`,
          title: 'Attendance recorded',
          subtitle: evt?.title || 'Shift attendance logged',
          timestamp: entry?.at,
          badge: 'Attendance',
        });
      });
  });

  (Array.isArray(deletionEvents) ? deletionEvents : []).forEach((entry) =>
    pushEntry(entry)
  );

  return bucket
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      timeAgo: formatDistanceToNow(entry.timestamp, { addSuffix: true }),
      badge: entry.badge,
    }));
};

const buildMemberActivities = ({ tasks, calendarEvents, hoursRanking }) => {
  const entries = [];
  const push = ({ id, title, subtitle, timestamp, badge }) => {
    const date = parseDateValue(timestamp);
    entries.push({
      id,
      title,
      subtitle,
      badge,
      timestamp: date ? date.getTime() : Date.now(),
    });
  };

  if (Array.isArray(tasks)) {
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = parseDateValue(a?.updatedAt || a?.createdAt || a?.deadline)?.getTime() || 0;
      const dateB = parseDateValue(b?.updatedAt || b?.createdAt || b?.deadline)?.getTime() || 0;
      return dateB - dateA;
    });
    sortedTasks.slice(0, 4).forEach((task) => {
      const stamp = task?.updatedAt || task?.createdAt || task?.deadline;
      push({
        id: `task-${task.id}`,
        title: `Task "${task?.name || 'Untitled'}" was updated`,
        subtitle: task?.description || 'Task status or details changed.',
        timestamp: stamp,
        badge: 'Task',
      });
    });
  }

  (Array.isArray(calendarEvents) ? calendarEvents : [])
    .filter((evt) => Array.isArray(evt.attendance) && evt.attendance.some((entry) => entry?.success))
    .slice(0, 3)
    .forEach((evt, idx) => {
      push({
        id: `attendance-${idx}`,
        title: 'Attendance recorded',
        subtitle: evt?.title || 'Shift attendance logged',
        timestamp: evt?.start,
        badge: 'Attendance',
      });
    });

  if (Array.isArray(hoursRanking) && hoursRanking.length) {
    push({
      id: 'ranking-highlight',
      title: `${hoursRanking[0].name} is leading the leaderboard`,
      subtitle: `Working ${hoursRanking[0].hours.toFixed(1)}h so far this month`,
      timestamp: Date.now(),
      badge: 'Leaderboard',
    });
  }

  return entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      subtitle: entry.subtitle,
      timeAgo: formatDistanceToNow(entry.timestamp, { addSuffix: true }),
      badge: entry.badge,
    }));
};
