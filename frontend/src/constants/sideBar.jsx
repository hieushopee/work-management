import { LayoutDashboard, Users, MessageSquare, ClipboardList, Calendar } from 'lucide-react';

export const SIDEBAR_OWNER_ITEMS = [
    {
        name: 'Manage Employees',
        path: '/',
        icon: <Users className="w-5 h-5" />
    },
    {
        name: 'Manage Tasks',
        path: '/manage-task',
        icon: <LayoutDashboard className="w-5 h-5" />
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
        name: 'My Tasks',
        path: '/',
        icon: <LayoutDashboard className="w-5 h-5" />
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