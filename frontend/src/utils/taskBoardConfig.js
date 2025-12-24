import { Circle, PlayCircle, CheckCircle } from 'lucide-react';

const STATUS_ALIASES = {
  todo: ['todo', 'pending', 'awaiting', 'notstarted', 'backlog'],
  doing: [
    'doing',
    'inprogress',
    'progress',
    'active',
    'working',
    'review',
    'testing',
    'qa',
    'verify',
    'blocked',
    'hold',
    'stalled',
    'late',
  ],
  done: ['done', 'completed', 'complete', 'finished', 'resolved'],
};

export const STATUS_COLUMNS = [
  {
    key: 'todo',
    title: 'To Do',
    badgeClass: 'bg-slate-100 text-slate-700',
    borderClass: 'border-red-200',
    icon: Circle,
    progressColor: 'bg-slate-400',
  },
  {
    key: 'doing',
    title: 'In Progress',
    badgeClass: 'bg-blue-100 text-blue-700',
    borderClass: 'border-blue-200',
    icon: PlayCircle,
    progressColor: 'bg-blue-500',
  },
  {
    key: 'done',
    title: 'Done',
    badgeClass: 'bg-green-100 text-green-700',
    borderClass: 'border-green-200',
    icon: CheckCircle,
    progressColor: 'bg-green-500',
  },
];

export const STATUS_SEQUENCE = STATUS_COLUMNS.map((col) => col.key);

export const normalizeTaskStatus = (status) => {
  const normalized = String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  for (const [key, aliases] of Object.entries(STATUS_ALIASES)) {
    if (key === normalized || aliases.includes(normalized)) {
      return key;
    }
  }
  return 'todo';
};

export const getStatusMeta = (status) => {
  const normalized = normalizeTaskStatus(status);
  const column = STATUS_COLUMNS.find((col) => col.key === normalized) || STATUS_COLUMNS[0];
  return { ...column, normalized };
};

export const getProgressForStatus = (status) => {
  const normalized = normalizeTaskStatus(status);
  switch (normalized) {
    case 'todo':
      return 15;
    case 'doing':
      return 60;
    case 'done':
      return 100;
    default:
      return 10;
  }
};

export const getNextStatus = (status) => {
  const normalized = normalizeTaskStatus(status);
  const currentIndex = STATUS_SEQUENCE.indexOf(normalized);
  if (currentIndex === -1 || currentIndex === STATUS_SEQUENCE.length - 1) return null;
  return STATUS_SEQUENCE[currentIndex + 1];
};

const PRIORITY_META = {
  low: {
    label: 'Low',
    className: 'text-emerald-700 bg-emerald-50',
    chipClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  },
  medium: {
    label: 'Medium',
    className: 'text-amber-700 bg-amber-50',
    chipClass: 'bg-amber-50 text-amber-700 border border-amber-100',
  },
  high: {
    label: 'High',
    className: 'text-orange-800 bg-orange-50',
    chipClass: 'bg-orange-50 text-orange-800 border border-orange-100',
  },
  critical: {
    label: 'Critical',
    className: 'text-red-700 bg-red-50',
    chipClass: 'bg-red-50 text-red-700 border border-red-100',
  },
};

export const getPriorityMeta = (priority) => {
  const normalized = String(priority || 'medium').toLowerCase();
  return PRIORITY_META[normalized] || PRIORITY_META.medium;
};
