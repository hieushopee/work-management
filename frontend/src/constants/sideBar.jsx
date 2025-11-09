import { LayoutDashboard, Users, MessageSquare, ClipboardList, Calendar, CheckSquare } from 'lucide-react';

export const SIDEBAR_OWNER_ITEMS = [
    {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'Manage Employees',
        path: '/',
        icon: <Users className="w-5 h-5" />
    },
    {
        name: 'Manage Tasks',
        path: '/manage-task',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Messages',
        path: '/message',
        icon: <MessageSquare className="w-5 h-5" />
    },
    {
        name: 'Forms',
        path: '/form',
        icon: <ClipboardList className="w-5 h-5" />
    },
    {
        name: 'Calendars',
        path: '/calendar',
        icon: <Calendar className="w-5 h-5" />
    },
]

export const SIDEBAR_EMPLOYEE_ITEMS = [
    {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
        name: 'My Tasks',
        path: '/',
        icon: <CheckSquare className="w-5 h-5" />
    },
    {
        name: 'Messages',
        path: '/message',
        icon: <MessageSquare className="w-5 h-5" />
    },
    {
        name: 'Forms',
        path: '/form',
        icon: <ClipboardList className="w-5 h-5" />
    },
    {
        name: 'Calendars',
        path: '/calendar',
        icon: <Calendar className="w-5 h-5" />
    },
]
