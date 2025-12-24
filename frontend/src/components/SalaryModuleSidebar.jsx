import { DollarSign, List, FileText, Settings, ChevronLeft, ChevronRight, TrendingUp, AlertCircle, UserCog } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import useUserStore from '../stores/useUserStore';
import { isAdmin, isManager, isStaff } from '../utils/roleUtils';

// Admin menu items - Only core admin functions
const adminItems = [
  { id: "list", label: "Salary List", icon: List, path: "/salary/list" },
  { id: "adjustments", label: "Adjustment Requests", icon: FileText, path: "/salary/adjustments" },
  { id: "base-salary", label: "Base Salary Settings", icon: UserCog, path: "/salary/base-settings" },
  { id: "settings", label: "Salary Settings", icon: Settings, path: "/salary/settings" },
  { id: "company", label: "Company Salaries", icon: DollarSign, path: "/salary/company" },
];

// Manager menu items
const managerItems = [
  { id: "list", label: "Salary List", icon: List, path: "/salary/list" },
  { id: "adjustments", label: "Adjustment Requests", icon: FileText, path: "/salary/adjustments" },
  { id: "department", label: "Department Salaries", icon: DollarSign, path: "/salary/department" },
];

// Staff menu items
const staffItems = [
  { id: "my-salary", label: "My Salary", icon: DollarSign, path: "/salary/my" },
];

const SalaryModuleSidebar = () => {
  const { pathname } = useLocation();
  const { user } = useUserStore();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('salaryModuleSidebarCollapsed') === 'true';
  });

  // Get menu items based on role
  const getMenuItems = () => {
    if (!user) return staffItems;
    const role = (user?.role || '').toLowerCase();
    
    // Admin and Owner see admin menu
    if (isAdmin(user) || role === 'owner') {
      return adminItems;
    }
    
    // Manager sees manager menu
    if (isManager(user)) {
      return managerItems;
    }
    
    // Staff and Employee see staff menu
    if (isStaff(user) || role === 'employee') {
      return staffItems;
    }
    
    // Default to staff menu
    return staffItems;
  };
  const items = getMenuItems();

  useEffect(() => {
    localStorage.setItem('salaryModuleSidebarCollapsed', collapsed ? 'true' : 'false');
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
            const isActive = pathname.startsWith(item.path);
            
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

export default SalaryModuleSidebar;



