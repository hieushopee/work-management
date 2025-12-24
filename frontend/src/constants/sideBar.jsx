import { LayoutDashboard, Users, MessageSquare, ClipboardList, Calendar, CheckSquare, Settings, DollarSign, FileText } from 'lucide-react';

// Admin sidebar - Full access to everything
export const SIDEBAR_ADMIN_ITEMS = [
    {
        name: 'Home',
        path: '/',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'User Management',
        path: '/employees',
        icon: <Users className="w-5 h-5" />
    },
    {
        name: 'Tasks',
        path: '/tasks',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Manage Tasks',
        path: '/tasks/analytics',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Messages',
        path: '/messages',
        icon: <MessageSquare className="w-5 h-5" />
    },
    {
        name: 'Forms',
        path: '/forms/my',
        icon: <ClipboardList className="w-5 h-5" />
    },
    {
        name: 'Calendars',
        path: '/calendar/manage/todo',
        icon: <Calendar className="w-5 h-5" />
    },
    {
        name: 'Salary',
        path: '/salary',
        icon: <DollarSign className="w-5 h-5" />
    },
    {
        name: 'Documents',
        path: '/documents',
        icon: <FileText className="w-5 h-5" />
    },
]

// Manager sidebar - Can manage department, similar to old owner
export const SIDEBAR_MANAGER_ITEMS = [
    {
        name: 'Home',
        path: '/',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'User Management',
        path: '/employees',
        icon: <Users className="w-5 h-5" />
    },
    {
        name: 'Tasks',
        path: '/tasks',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Manage Tasks',
        path: '/tasks/analytics',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Messages',
        path: '/messages',
        icon: <MessageSquare className="w-5 h-5" />
    },
    {
        name: 'Forms',
        path: '/forms/my',
        icon: <ClipboardList className="w-5 h-5" />
    },
    {
        name: 'Calendars',
        path: '/calendar/manage/todo',
        icon: <Calendar className="w-5 h-5" />
    },
    {
        name: 'Salary',
        path: '/salary',
        icon: <DollarSign className="w-5 h-5" />
    },
    {
        name: 'Documents',
        path: '/documents',
        icon: <FileText className="w-5 h-5" />
    },
]

// Staff sidebar - Personal items only, similar to old employee
export const SIDEBAR_STAFF_ITEMS = [
    {
        name: 'Home',
        path: '/',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'Tasks',
        path: '/tasks',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Messages',
        path: '/messages',
        icon: <MessageSquare className="w-5 h-5" />
    },
    {
        name: 'Forms',
        path: '/forms/my',
        icon: <ClipboardList className="w-5 h-5" />
    },
    {
        name: 'Calendars',
        path: '/calendar/manage/todo',
        icon: <Calendar className="w-5 h-5" />
    },
    {
        name: 'Salary',
        path: '/salary',
        icon: <DollarSign className="w-5 h-5" />
    },
    {
        name: 'Documents',
        path: '/documents',
        icon: <FileText className="w-5 h-5" />
    },
]

// Legacy exports for backward compatibility (will be removed later)
export const SIDEBAR_OWNER_ITEMS = SIDEBAR_ADMIN_ITEMS;
export const SIDEBAR_EMPLOYEE_ITEMS = SIDEBAR_STAFF_ITEMS;
