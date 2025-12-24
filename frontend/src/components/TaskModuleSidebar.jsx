import { ClipboardList, UserCheck, ChevronLeft, ChevronRight, List, BarChart3, ListChecks } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import useUserStore from '../stores/useUserStore';
import { isAdmin, isManager, isStaff } from '../utils/roleUtils';

// Admin menu items
const adminItems = [
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/tasks/analytics" },
  { id: "board", label: "Task Board", icon: ClipboardList, path: "/tasks/board" },
  { id: "checklist", label: "Checklist", icon: ListChecks, path: "/tasks/checklists" },
];

// Manager menu items
const managerItems = [
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/tasks/analytics" },
  { id: "board", label: "Task Board", icon: ClipboardList, path: "/tasks/board" },
  { id: "my-tasks", label: "My Tasks", icon: UserCheck, path: "/tasks" },
  { id: "checklist", label: "Check List", icon: ListChecks, path: "/tasks/checklists" },
  { id: "my-checklist", label: "My Check List", icon: ListChecks, path: "/tasks/my-checklist" },
];

// Staff menu items
const staffItems = [
  { id: "my-tasks", label: "My Tasks", icon: UserCheck, path: "/tasks" },
  { id: "my-checklist", label: "My Check List", icon: ListChecks, path: "/tasks/my-checklist" },
];

const TaskModuleSidebar = () => {
  const { pathname } = useLocation();
  const { user } = useUserStore();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('taskModuleSidebarCollapsed') === 'true';
  });

  // Get menu items based on role
  const getMenuItems = () => {
    const role = (user?.role || '').toLowerCase();
    if (isAdmin(user) || role === 'owner') return adminItems;
    if (isManager(user)) return managerItems;
    return staffItems;
  };
  const items = getMenuItems();

  useEffect(() => {
    localStorage.setItem('taskModuleSidebarCollapsed', collapsed ? 'true' : 'false');
  }, [collapsed]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Find the active item by matching the most specific path first
  const sortedItems = [...items].sort((a, b) => b.path.length - a.path.length);
  const activeItem = sortedItems.find(item => 
    pathname === item.path || pathname.startsWith(item.path + '/')
  );

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-border-light flex flex-col transition-all duration-300 relative h-full shadow-soft`}>
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-border-light rounded-full flex items-center justify-center shadow-soft hover:shadow-soft-md hover:bg-bg-secondary transition-all z-10 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem?.id === item.id;
            
            return (
              <li key={item.id}>
                {collapsed ? (
                  <div className="relative group">
                    <Link
                      to={item.path}
                      className={`w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActive 
                          ? 'bg-primary text-white shadow-soft' 
                          : 'text-text-secondary hover:bg-bg-hover hover:text-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </Link>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-text-main text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-soft-lg">
                      {item.label}
                    </div>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                      isActive 
                        ? 'bg-primary text-white shadow-soft' 
                        : 'text-text-main hover:bg-bg-hover hover:text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default TaskModuleSidebar;
