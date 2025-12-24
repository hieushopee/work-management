import {
  BarChart3,
  Clock3,
  History,
  MapPin,
  MapPinned,
  Notebook,
  Settings2,
  Shuffle,
  SquareKanban,
  ChevronLeft,
  ChevronRight,
  ListTree,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import useUserStore from "../stores/useUserStore";

// Admin menu
const adminGroups = [
  {
    id: "summary",
    label: "Analytics",
    icon: BarChart3,
    children: [
      { id: "summary-overview", label: "Overview", path: "/attendance/summary/overview" },
      { id: "summary-detail", label: "Detailed Analytics", path: "/attendance/summary/detail" },
    ],
  },
  {
    id: "timekeeping",
    label: "Timekeeping",
    icon: ListTree,
    children: [
      { id: "shifts", label: "Shifts", path: "/attendance/shifts" },
      { id: "shift-assignment", label: "Shift Assignment", path: "/attendance/shift-assignment" },
      { id: "devices", label: "Devices", path: "/attendance/devices" },
      { id: "locations", label: "Locations", path: "/attendance/locations" },
      { id: "location-assignment", label: "Location Assignment", path: "/attendance/location-assignment" },
    ],
  },
  {
    id: "requests",
    label: "Requests",
    icon: ClipboardList,
    path: "/attendance/forms",
  },
  {
    id: "rules",
    label: "Attendance Rules",
    icon: Settings2,
    path: "/attendance/rules",
  },
];

// Manager menu: thống kê trước, sau đó cá nhân
const managerGroups = [
  {
    id: "summary",
    label: "Analytics",
    icon: BarChart3,
    children: [
      { id: "summary-overview", label: "Summary Overview", path: "/attendance/summary/overview" },
      { id: "summary-detail", label: "Detailed Analytics", path: "/attendance/summary/detail" },
    ],
  },
  {
    id: "personal",
    label: "For Me",
    icon: Clock3,
    children: [
      { id: "checkin", label: "Timekeeping", path: "/attendance/checkin" },
      { id: "history", label: "Attendance History", path: "/attendance/history" },
      { id: "my-shifts", label: "My Shifts", path: "/attendance/my-shifts" },
      { id: "forms", label: "Requests", path: "/attendance/forms" },
    ],
  },
  {
    id: "rules",
    label: "Attendance Rules",
    icon: Settings2,
    path: "/attendance/rules",
  },
];

// Staff menu
const staffGroups = [
  {
    id: "checkin",
    label: "Timekeeping",
    icon: Clock3,
    path: "/attendance/checkin",
  },
  {
    id: "history",
    label: "Attendance History",
    icon: History,
    path: "/attendance/history",
  },
  {
    id: "my-shifts",
    label: "My Shifts",
    icon: CalendarClock,
    path: "/attendance/my-shifts",
  },
  {
    id: "forms",
    label: "Requests",
    icon: ClipboardList,
    path: "/attendance/forms",
  },
];

const AttendanceModuleSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const role = user?.role?.toLowerCase() || "staff";
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("attendanceModuleSidebarCollapsed") === "true";
  });
  const [openGroups, setOpenGroups] = useState(() => {
    const saved = localStorage.getItem("attendanceModuleSidebarOpen");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { summary: true, timekeeping: true, personal: true, requests: true };
      }
    }
    return { summary: true, timekeeping: true, personal: true, requests: true };
  });

  useEffect(() => {
    localStorage.setItem("attendanceModuleSidebarCollapsed", collapsed ? "true" : "false");
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("attendanceModuleSidebarOpen", JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActivePath = useMemo(() => pathname, [pathname]);

  // Choose menu based on role
  const navGroups = useMemo(() => {
    if (role === "admin") {
      return adminGroups;
    }
    if (role === "manager") {
      return managerGroups;
    }
    return staffGroups;
  }, [role]);

  // Khi vào module attendance root, tự chuyển đến mục đầu tiên phù hợp role
  useEffect(() => {
    const isRootAttendance = pathname === "/attendance" || pathname === "/attendance/";
    if (!isRootAttendance) return;
    const first = navGroups[0];
    let target = "";
    if (first) {
      if (Array.isArray(first.children) && first.children.length > 0) {
        target = first.children[0].path;
      } else if (first.path) {
        target = first.path;
      }
    }
    if (target) {
      navigate(target, { replace: true });
    }
  }, [pathname, navGroups, navigate]);

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-white border-r border-border-light flex flex-col transition-all duration-300 relative h-full shadow-soft`}
    >
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
          {navGroups.map((group) => {
            const Icon = group.icon;
            const hasChildren = Array.isArray(group.children);
            const groupOpen = openGroups[group.id] ?? true;
            const isActiveGroup =
              (group.path && (isActivePath === group.path || isActivePath.startsWith(group.path + "/"))) ||
              (hasChildren && group.children.some((child) => isActivePath.startsWith(child.path)));

            if (!hasChildren) {
              const isActive = isActiveGroup;
              return (
                <li key={group.id}>
                  {collapsed ? (
                    <div className="relative group">
                      <Link
                        to={group.path}
                        className={`w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                          isActive ? "bg-primary text-white shadow-soft" : "text-text-secondary hover:bg-bg-hover hover:text-primary"
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                      </Link>
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-text-main text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-soft-lg">
                        {group.label}
                      </div>
                    </div>
                  ) : (
                    <Link
                      to={group.path}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActive ? "bg-primary text-white shadow-soft" : "text-text-main hover:bg-bg-hover hover:text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{group.label}</span>
                    </Link>
                  )}
                </li>
              );
            }

            return (
              <li key={group.id} className="space-y-1">
                {collapsed ? (
                  <div className="relative group">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-center px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActiveGroup ? "bg-primary text-white shadow-soft" : "text-text-secondary hover:bg-bg-hover hover:text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </button>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-text-main text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                      {group.label}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActiveGroup ? "bg-primary text-white" : "text-text-main hover:bg-bg-hover"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <span className="text-xs">{groupOpen ? "▼" : "►"}</span>
                  </button>
                )}

                {!collapsed && groupOpen && (
                  <ul className="pl-4 space-y-1">
                    {group.children.map((child) => {
                      const isChildActive = isActivePath === child.path || isActivePath.startsWith(child.path + "/");
                      return (
                        <li key={child.id}>
                          <Link
                            to={child.path}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                              isChildActive ? "bg-primary-50 text-primary" : "text-text-secondary hover:bg-bg-hover"
                            }`}
                          >
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default AttendanceModuleSidebar;
