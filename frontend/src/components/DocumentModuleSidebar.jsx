import { BarChart3, FileText, FolderOpen, ChevronLeft, ChevronRight, CheckCircle2, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import useUserStore from '../stores/useUserStore';
import { isAdmin, isManager, isStaff } from '../utils/roleUtils';

// Admin menu items
const adminItems = [
  { id: "statistics", label: "Statistics", icon: BarChart3, path: "/documents/statistics" },
  { id: "company", label: "Company Files", icon: FolderOpen, path: "/documents/view/company" },
  { id: "personal", label: "Personal Files", icon: FileText, path: "/documents/view/personal" },
  { id: "manage", label: "Manage Documents", icon: FileText, path: "/documents/manage" },
  { id: "review", label: "Review Documents", icon: CheckCircle2, path: "/documents/review" },
];

const managerItems = [
  { id: "statistics", label: "Statistics", icon: BarChart3, path: "/documents/statistics" },
  { id: "company", label: "Company Files", icon: FolderOpen, path: "/documents/view/company" },
  { id: "personal", label: "Personal Files", icon: FileText, path: "/documents/view/personal" },
  { id: "review", label: "Review Documents", icon: CheckCircle2, path: "/documents/review" },
];

const staffItems = [
  { id: "company", label: "Company Files", icon: FolderOpen, path: "/documents/view/company" },
  { id: "personal", label: "Personal Files", icon: FileText, path: "/documents/view/personal" },
  { id: "submit", label: "Submit Document", icon: Send, path: "/documents/submit" },
];

const DocumentModuleSidebar = () => {
  const { pathname } = useLocation();
  const { user } = useUserStore();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('documentModuleSidebarCollapsed') === 'true';
  });

  // Get menu items based on role
  const getMenuItems = () => {
    const role = (user?.role || '').toLowerCase();
    if (isAdmin(user) || role === 'owner') return adminItems;
    if (isManager(user)) return managerItems;
    if (isStaff(user) || role === 'employee') return staffItems;
    return [];
  };
  const items = getMenuItems();

  useEffect(() => {
    localStorage.setItem('documentModuleSidebarCollapsed', collapsed ? 'true' : 'false');
  }, [collapsed]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

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
            // Check exact match first, then check if pathname starts with item.path
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            
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
                      title={item.label}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-text-main text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-soft-lg">
                      {item.label}
                    </div>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                      isActive 
                        ? 'bg-primary text-white shadow-soft' 
                        : 'text-text-main hover:bg-bg-hover hover:text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
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

export default DocumentModuleSidebar;







