import { MessageCircle, Users, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';

const items = [
  { id: "inbox", label: "Inbox", icon: MessageCircle, path: "/messages" },
  { id: "group", label: "Group", icon: Users, path: "/messages/groups" },
  { id: "ai", label: "Chat AI", icon: Bot, path: "/messages/ai" },
];

const MessageModuleSidebar = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('messageModuleSidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('messageModuleSidebarCollapsed', collapsed ? 'true' : 'false');
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
            const isInbox = item.id === "inbox";
            const isGroup = item.id === "group";
            const isAi = item.id === "ai";

            // Check active state - prioritize more specific routes first
            let isActive = false;
            
            if (isGroup) {
              // Group is active if path matches group routes
              isActive = pathname === item.path ||
                         pathname.startsWith(item.path + "/") ||
                         pathname.startsWith("/messages/group/");
            } else if (isAi) {
              // AI is active if path matches AI routes
              isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            } else if (isInbox) {
              // Inbox is active if path matches inbox routes, but NOT group or AI routes
              isActive = (pathname === "/messages" ||
                         pathname === "/messages/" ||
                         pathname.startsWith("/messages/inbox")) &&
                         !pathname.startsWith("/messages/groups") &&
                         !pathname.startsWith("/messages/group/") &&
                         !pathname.startsWith("/messages/ai");
            }
            
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

export default MessageModuleSidebar;
