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
} from 'lucide-react';
import axios from '../libs/axios';
import { useTaskStore } from '../stores/useTaskStore';
import useUserStore from '../stores/useUserStore';
import { format, formatDistanceToNow, isSameDay, startOfMonth, endOfMonth, subDays } from 'date-fns';

const cardBase =
  'rounded-3xl border border-slate-100 bg-white/90 shadow-sm px-5 py-4 flex flex-col gap-1 transition hover:shadow-md';

const badgeStyles = {
  Task: 'bg-blue-50 text-blue-600',
  Attendance: 'bg-emerald-50 text-emerald-600',
  Leaderboard: 'bg-amber-50 text-amber-600',
  Message: 'bg-indigo-50 text-indigo-600',
  Member: 'bg-pink-50 text-pink-600',
  Form: 'bg-cyan-50 text-cyan-600',
  Calendar: 'bg-purple-50 text-purple-600',
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
      if (user.role === 'owner') {
        await getAllTasks();
      } else {
        await getTasksByUserId(user.id);
      }
    };
    fetchTasks();
  }, [user?.id, user?.role, getAllTasks, getTasksByUserId, refreshTick]);

  const computeAttendanceAndRanking = useCallback((events, employeeList) => {
    const today = new Date();
    const attendanceSet = new Set();
    const hoursMap = new Map();

    events.forEach((event) => {
      const startDate = event?.start ? new Date(event.start) : null;
      if (startDate && !Number.isNaN(startDate.getTime()) && isSameDay(startDate, today)) {
        (Array.isArray(event.attendance) ? event.attendance : []).forEach((entry) => {
          if (entry?.success && entry?.userId) {
            attendanceSet.add(String(entry.userId));
          }
        });
      }

      (Array.isArray(event.shiftLogs) ? event.shiftLogs : []).forEach((log) => {
        const userId = log?.userId;
        if (!userId) return;
        let minutes = Number(log?.totalMinutes || 0);
        if ((!minutes || minutes <= 0) && log?.startedAt && log?.endedAt) {
          const startTs = new Date(log.startedAt).getTime();
          const endTs = new Date(log.endedAt).getTime();
          if (Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs) {
            minutes = (endTs - startTs) / 60000;
          }
        }
        if (minutes > 0) {
          const key = String(userId);
          hoursMap.set(key, (hoursMap.get(key) || 0) + minutes / 60);
        }
      });
    });

    setAttendanceToday(attendanceSet.size);

    const ranking = Array.from(hoursMap.entries())
      .map(([userId, hours]) => {
        const employee = employeeList.find((emp) => String(emp.id) === userId);
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
          const params = {
            start: startOfMonth(now).toISOString(),
            end: endOfMonth(now).toISOString(),
            members: list.map((emp) => emp.id),
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
          computeAttendanceAndRanking(eventList, list);
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
    if (user?.role === 'owner') {
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

  const topTenRanking = useMemo(() => hoursRanking.slice(0, 10), [hoursRanking]);
  const overduePercent = taskSummary.total ? Math.min((taskSummary.overdue / taskSummary.total) * 100, 100) : 0;

  useEffect(() => {
    if (user?.role !== 'owner') {
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
      if (user?.role !== 'owner') return;
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
    <div className='h-full overflow-y-auto bg-slate-50 px-6 py-6'>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-sm text-slate-500'>Hello, {user?.name || 'team'} 👋</p>
          <h1 className='text-3xl font-semibold text-slate-900'>Dashboard</h1>
          <p className='text-xs text-slate-400'>Overview for {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <button
          type='button'
          onClick={() => setRefreshTick((prev) => prev + 1)}
          className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600'
          disabled={loading || tasksLoading}
        >
          {loading || tasksLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {summaryCards(employees.length, taskSummary, attendanceToday).map((card) => (
          <div key={card.title} className={cardBase}>
            <div className='flex items-center justify-between'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>{card.title}</p>
              <span className='rounded-2xl bg-slate-100 p-2'>{card.icon}</span>
            </div>
            <div className='text-3xl font-semibold text-slate-900'>{card.value}</div>
            <p className='text-xs text-slate-500'>{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-3'>
        <div className='space-y-6 xl:col-span-2'>
          <div className='rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Task Overview</h2>
                <p className='text-sm text-slate-500'>Progress across all assignments</p>
              </div>
              <TrendingUp className='h-5 w-5 text-slate-400' />
            </div>
            <div className='mt-4 grid gap-4 md:grid-cols-3'>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <p className='text-xs text-slate-500'>To do</p>
                <p className='text-2xl font-semibold text-slate-900'>{taskSummary.todo}</p>
              </div>
              <div className='rounded-2xl bg-blue-50 p-4'>
                <p className='text-xs text-blue-600'>In progress</p>
                <p className='text-2xl font-semibold text-blue-700'>{taskSummary.inProgress}</p>
              </div>
              <div className='rounded-2xl bg-emerald-50 p-4'>
                <p className='text-xs text-emerald-600'>Completed</p>
                <p className='text-2xl font-semibold text-emerald-700'>{taskSummary.done}</p>
              </div>
            </div>
            <div className='mt-6 space-y-2 text-sm text-slate-500'>
              <div className='flex items-center justify-between'>
                <span>Overdue tasks</span>
                <span className='font-medium text-rose-600'>{taskSummary.overdue}</span>
              </div>
              <div className='h-2 rounded-full bg-slate-100'>
                <div
                  className='h-full rounded-full bg-rose-500 transition-all'
                  style={{ width: `${overduePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className='rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Recent activity</h2>
                <p className='text-sm text-slate-500'>Latest updates from tasks and attendance</p>
              </div>
              <MessageSquare className='h-5 w-5 text-slate-400' />
            </div>
            <div className='mt-4 space-y-4 max-h-[240px] overflow-y-auto pr-2'>
              {recentActivities.length === 0 && (
                <p className='text-sm text-slate-500'>No recent updates yet.</p>
              )}
              {recentActivities.map((item) => (
                <div key={item.id} className='flex items-start gap-3 rounded-2xl bg-slate-50 p-4'>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      badgeStyles[item.badge] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-slate-900'>{item.title}</p>
                    <p className='text-xs text-slate-500'>{item.subtitle}</p>
                  </div>
                  <span className='text-xs text-slate-400'>{item.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          <div
            role='button'
            tabIndex={0}
            onClick={() => setLeaderboardModalOpen(true)}
            onKeyDown={handleLeaderboardKeyDown}
            className='rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm outline-none transition hover:border-amber-100 hover:shadow-md focus-visible:ring-2 focus-visible:ring-amber-200 cursor-pointer'
          >
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Leaderboard</h2>
                <p className='text-sm text-slate-500'>Top 10 by working hours</p>
              </div>
              <Trophy className='h-6 w-6 text-amber-500' />
            </div>
            <div className='mt-4 space-y-3'>
              {topTenRanking.length === 0 && (
                <p className='text-sm text-slate-500'>No ranked members yet.</p>
              )}
              {topTenRanking.map((entry, idx) => (
                <div key={entry.userId || idx} className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-semibold text-slate-500'>#{idx + 1}</span>
                    <div>
                      <p className='text-sm font-medium text-slate-900'>{entry.name}</p>
                      <p className='text-xs text-slate-500'>{entry.role || 'Member'}</p>
                    </div>
                  </div>
                  <span className='text-sm font-semibold text-slate-900'>{entry.hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
            <p className='mt-4 text-center text-xs font-medium text-amber-600'>Tap to view full ranking</p>
          </div>

          <div className='rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Time tracking</h2>
                <p className='text-sm text-slate-500'>Captured from shift logs</p>
              </div>
              <Clock className='h-5 w-5 text-slate-400' />
            </div>
            <div className='mt-4 space-y-4'>
              <div>
                <p className='text-xs uppercase tracking-wide text-slate-500'>Total tracked hours</p>
                <p className='text-3xl font-semibold text-slate-900'>
                  {timeTrackingStats.totalHours.toFixed(1)}h
                </p>
              </div>
              <div className='rounded-2xl bg-slate-50 p-4'>
                <p className='text-xs text-slate-500'>Average per member</p>
                <p className='text-xl font-semibold text-slate-900'>{timeTrackingStats.average.toFixed(1)}h</p>
              </div>
              {timeTrackingStats.topPerformer && (
                <div className='rounded-2xl bg-emerald-50 p-4'>
                  <p className='text-xs text-emerald-600'>Top performer</p>
                  <p className='text-sm font-semibold text-slate-900'>{timeTrackingStats.topPerformer.name}</p>
                  <p className='text-xs text-slate-500'>
                    {timeTrackingStats.topPerformer.hours.toFixed(1)}h logged this month
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {leaderboardModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10'>
          <div className='w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-sm uppercase tracking-wide text-amber-500'>Leaderboard</p>
                <h3 className='text-2xl font-semibold text-slate-900'>Full ranking</h3>
                <p className='text-xs text-slate-500'>Ordered by total working hours this month</p>
              </div>
              <button
                type='button'
                onClick={() => setLeaderboardModalOpen(false)}
                className='rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
            <div className='mt-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100'>
              {hoursRanking.length === 0 && (
                <p className='py-6 text-center text-sm text-slate-500'>No data available.</p>
              )}
              {hoursRanking.map((entry, idx) => (
                <div key={entry.userId || idx} className='flex items-center justify-between gap-4 py-3'>
                  <div className='flex items-center gap-4'>
                    <span className='text-base font-semibold text-slate-500'>#{idx + 1}</span>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>{entry.name}</p>
                      <p className='text-xs text-slate-500'>{entry.role || 'Member'}</p>
                    </div>
                  </div>
                  <span className='text-sm font-semibold text-slate-900'>{entry.hours.toFixed(2)}h</span>
                </div>
              ))}
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
    icon: <Users className='h-5 w-5 text-blue-600' />,
  },
  {
    title: 'Total Tasks',
    value: taskSummary.total,
    subtitle: 'Across all projects',
    icon: <ClipboardList className='h-5 w-5 text-emerald-600' />,
  },
  {
    title: 'Attendance Today',
    value: attendanceToday,
    subtitle: 'Checked-in members',
    icon: <CalendarCheck className='h-5 w-5 text-indigo-600' />,
  },
  {
    title: 'Active Tasks',
    value: taskSummary.inProgress,
    subtitle: 'Currently in progress',
    icon: <Activity className='h-5 w-5 text-amber-500' />,
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
