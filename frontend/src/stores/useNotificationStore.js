import { create } from 'zustand';
import axios from '../libs/axios';
import {
  formatDistanceToNow,
  isAfter,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

const STORAGE_KEY = 'readNotifications';

const loadReadIds = () => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
};

const persistReadIds = (ids) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
};

const normalizeDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const useNotificationStore = create((set) => ({
  notifications: [],
  loading: false,
  unreadCount: 0,
  fetchNotifications: async (userId, role) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const [
        conversationsRes,
        tasksRes,
        formsRes,
        calendarRes,
      ] = await Promise.all([
        axios.get(`/messages/conversations/${userId}`),
        axios.get(`/tasks/${userId}`),
        axios.get('/forms'),
        axios.get('/calendar', {
          params: {
            start: startOfDay(new Date()).toISOString(),
            end: endOfDay(new Date()).toISOString(),
            members: [userId],
          },
        }),
      ]);

      const notifications = [];
      const now = new Date();
      const recentThreshold = subDays(now, 7);

      const conversations = Array.isArray(conversationsRes.data) ? conversationsRes.data : [];
      conversations
        .filter((conv) => Number(conv?.unreadCount) > 0)
        .forEach((conv) => {
          notifications.push({
            id: `msg-${conv.partnerId}`,
            type: 'message',
            title: `New message from ${conv.partnerName || 'Teammate'}`,
            description: conv.previewText || conv.lastMessage || 'They sent you a message.',
            time: conv.timestamp ? normalizeDate(conv.timestamp) : now,
            read: false,
            meta: {
              route: conv.partnerId ? `/message/${conv.partnerId}` : '/message',
              partnerId: conv.partnerId,
            },
            count: Math.max(1, Number(conv.unreadCount) || 1),
          });
        });

      const tasks = Array.isArray(tasksRes.data?.tasks) ? tasksRes.data.tasks : [];
      tasks
        .filter((task) => {
          const createdAt = normalizeDate(task.createdAt || task.updatedAt || task.deadline);
          return createdAt && isAfter(createdAt, recentThreshold);
        })
        .forEach((task) => {
          const isOwner = role === 'owner';
          const taskRoute = isOwner ? '/manage-task' : '/';
          notifications.push({
            id: `task-${task.id}`,
            type: 'task',
            title: `New task: ${task.name || 'Untitled'}`,
            description: task.description || 'You have a new assignment.',
            time: normalizeDate(task.createdAt || task.updatedAt || task.deadline) || now,
            read: false,
            meta: {
              route: taskRoute,
              taskId: task.id,
            },
            count: 1,
          });
        });

      const forms = Array.isArray(formsRes.data) ? formsRes.data : [];
      forms
        .filter((form) => {
          const createdAt = normalizeDate(form.createdAt);
          return createdAt && isAfter(createdAt, recentThreshold);
        })
        .forEach((form) => {
          notifications.push({
            id: `form-${form.id}`,
            type: 'form',
            title: `New form: ${form.title || 'Untitled form'}`,
            description: 'A new form is available.',
            time: normalizeDate(form.createdAt) || now,
            read: false,
            meta: {
              route: '/form',
              formId: form.id,
            },
            count: 1,
          });
        });

      const calendarEvents = Array.isArray(calendarRes.data) ? calendarRes.data : [];
      calendarEvents.forEach((evt, index) => {
        notifications.push({
          id: `event-${evt.id || index}`,
          type: 'calendar',
          title: evt.title || 'Upcoming event',
          description: evt.start
            ? `Starts at ${new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Scheduled for today.',
          time: normalizeDate(evt.start) || now,
          read: false,
          meta: {
            route: '/calendar',
            eventId: evt.id,
          },
          count: 1,
        });
      });

      const sorted = notifications
        .map((notif) => ({
          ...notif,
          time: notif.time || now,
          timeAgo: formatDistanceToNow(notif.time || now, { addSuffix: true }),
        }))
        .sort((a, b) => b.time - a.time);

      const readIds = loadReadIds();
      const withReadState = sorted.map((notif) => ({
        ...notif,
        count: Math.max(1, Number(notif.count) || 1),
        read: readIds.has(notif.id),
      }));

      set({
        notifications: withReadState,
        loading: false,
        unreadCount: withReadState
          .filter((n) => !n.read)
          .reduce((sum, notif) => sum + (notif.count || 1), 0),
      });
    } catch (error) {
      console.error('Failed to load notifications', error);
      set({ loading: false });
    }
  },
  markNotificationAsRead: (id) => {
    set((state) => {
      const readIds = loadReadIds();
      readIds.add(id);
      persistReadIds(readIds);

      const updated = state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      );
      return {
        notifications: updated,
        unreadCount: updated
          .filter((n) => !n.read)
          .reduce((sum, notif) => sum + (notif.count || 1), 0),
      };
    });
  },
  markAllAsRead: () => {
    set((state) => {
      const readIds = loadReadIds();
      state.notifications.forEach((notif) => readIds.add(notif.id));
      persistReadIds(readIds);
      return {
        notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
        unreadCount: 0,
      };
    });
  },
}));
