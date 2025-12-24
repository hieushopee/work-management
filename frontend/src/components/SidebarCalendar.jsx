// src/components/SidebarCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  Users,
} from "lucide-react";

const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const avatarFallbackDataUrl = (name = "U") => {
  const initials = String(name || "U")
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#E2E8F0" />
  <text x="50%" y="50%" dy=".35em" text-anchor="middle"
        fill="#334155" font-family="Inter, Arial, sans-serif" font-size="24">
    ${initials}
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SidebarCalendar = ({
  selectedDate,
  setSelectedDate,
  employees,
  selectedMembers,
  setSelectedMembers,
  isLoading,
  currentUser,
  onCreateEvent,
  events = [],
  onMonthChange,
  isMonthView = false,
  onRequestViewMode,
  departments = [],
}) => {
  const [expandedTeams, setExpandedTeams] = useState(() => new Set());
  const [calendarValue, setCalendarValue] = useState(selectedDate);
  const [activeStartDate, setActiveStartDate] = useState(selectedDate);
  const today = useMemo(() => new Date(), []);

  const departmentColorMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(departments) ? departments : []).forEach((dept) => {
      const id = dept?._id || dept?.id;
      const color = dept?.color || '';
      if (id) map.set(String(id), color);
      if (dept?.name) map.set(`name:${dept.name}`, color);
    });
    return map;
  }, [departments]);

  const departmentNameColorMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(departments) ? departments : []).forEach((dept) => {
      if (dept?.name) {
        map.set(dept.name, dept.color || '');
      }
    });
    return map;
  }, [departments]);

  const toRgba = (color, alpha = 0.12) => {
    if (!color) return null;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const fullHex = hex.length === 3
        ? hex.split('').map((c) => c + c).join('')
        : hex.padEnd(6, '0').slice(0, 6);
      const r = parseInt(fullHex.slice(0, 2), 16);
      const g = parseInt(fullHex.slice(2, 4), 16);
      const b = parseInt(fullHex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      return color.replace(/^rgb\(/, 'rgba(').replace(/\)$/, `, ${alpha})`);
    }
    return null;
  };

  const departmentInfoMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(departments) ? departments : []).forEach((dept) => {
      const id = dept?._id || dept?.id;
      if (id) map.set(String(id), dept);
    });
    return map;
  }, [departments]);

  const getDeptInfo = useCallback((emp) => {
    const dept = emp?.department;
    let name = "No Department";
    let color = "";

    if (!dept) {
      return { name, color };
    }

    if (typeof dept === "string") {
      const byId = departmentInfoMap.get(dept);
      if (byId) {
        name = byId.name || name;
        color =
          byId.color ||
          departmentColorMap.get(String(byId._id || byId.id)) ||
          departmentColorMap.get(`name:${byId.name}`) ||
          "";
      } else {
        name = dept || name;
        color = departmentColorMap.get(dept) || departmentColorMap.get(`name:${dept}`) || "";
      }
    } else if (typeof dept === "object") {
      if (dept.name) name = dept.name;
      const idKey = dept._id || dept.id;
      if (idKey && departmentColorMap.has(String(idKey))) {
        color = departmentColorMap.get(String(idKey));
      } else if (dept.name) {
        color = departmentColorMap.get(`name:${dept.name}`) || dept.color || "";
      } else {
        color = dept.color || "";
      }
    }

    return { name, color };
  }, [departmentColorMap]);

  const eventDateSet = useMemo(() => {
    const set = new Set();
    events.forEach((evt) => {
      if (!evt) return;
      const startDate = evt.start instanceof Date ? evt.start : new Date(evt.start);
      if (!Number.isNaN(startDate?.getTime?.())) {
        set.add(formatDateKey(startDate));
      }
    });
    return set;
  }, [events]);

  useEffect(() => {
    setCalendarValue(selectedDate);
    setActiveStartDate(selectedDate);
  }, [selectedDate]);

  const groupedEmployees = useMemo(() => {
    const list = Array.isArray(employees) ? [...employees] : [];

    if (currentUser && !list.some((emp) => emp.id === currentUser.id)) {
      list.unshift({
        id: currentUser.id,
        name: currentUser.name || "Owner",
        email: currentUser.email || "",
        role: currentUser.role || "owner",
        department: currentUser.department || null,
        teamNames: currentUser.teamNames || [],
        avatar: currentUser.avatar || null,
        faceUrl: currentUser.faceUrl || null,
      });
    }

    const currentDept = getDeptInfo(currentUser);
    const currentDeptName = currentDept.name;
    const isAdmin = currentUser?.role === "admin";

    // Filter visibility: admin sees all; others see their department (including "No Department")
    const filtered = list.filter((emp) => {
      if (isAdmin) return true;
      return getDeptInfo(emp).name === currentDeptName;
    });

    const deptMap = new Map();
    filtered.forEach((emp) => {
      const { name: deptName, color } = getDeptInfo(emp);
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { members: [], color });
      }
      const bucket = deptMap.get(deptName);
      // Ensure color is preserved/updated if later entries have color
      if (!bucket.color && color) {
        bucket.color = color;
      }
      if (!bucket.members.some((member) => member.id === emp.id)) {
        bucket.members.push(emp);
      }
    });

    const grouped = Array.from(deptMap.entries()).map(([deptName, entry]) => ({
      teamName: deptName, // reuse rendering keys; rename later in render
      color: entry.color || "",
      members: entry.members.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    }));

    return grouped.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [employees, currentUser, getDeptInfo]);

  useEffect(() => {
    if (currentUser && selectedMembers.length === 0) {
      const current = groupedEmployees
        .flatMap((team) => team.members)
        .find((member) => member.id === currentUser.id);
      if (current) {
        setSelectedMembers([current.id]);
      }
    }
  }, [groupedEmployees, currentUser, selectedMembers, setSelectedMembers]);

  const toggleTeamExpansion = (teamName) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allMembers = groupedEmployees.flatMap((team) => team.members);
    const unique = allMembers.filter(
      (member, idx, self) => idx === self.findIndex((m) => m.id === member.id)
    );
    setSelectedMembers(unique.map((member) => member.id));
  };

  const deselectAll = () => setSelectedMembers([]);

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    );
  };

  const allMemberIds = useMemo(() => {
    const ids = new Set();
    groupedEmployees.forEach((team) => {
      team.members.forEach((member) => {
        if (member?.id) ids.add(member.id);
      });
    });
    return Array.from(ids);
  }, [groupedEmployees]);

  const isAllSelected =
    allMemberIds.length > 0 && allMemberIds.every((id) => selectedMembers.includes(id));

  const toggleAllSelection = () => {
    if (isAllSelected) {
      deselectAll();
    } else {
      setSelectedMembers(allMemberIds);
    }
  };

  const handleCreateEvent = () => {
    if (selectedMembers.length !== 1 || !currentUser) {
      alert("Please select exactly 1 member to create an event.");
      return;
    }

    if (selectedMembers[0] !== currentUser.id) {
      alert("You can only create events for yourself.");
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    onCreateEvent?.({
      start,
      end,
      assignedTo: selectedMembers,
      title: "",
      taskDescription: "",
      reportNotes: "",
      reportAttachments: [],
    });
  };

  return (
    <aside className="w-[17rem] flex flex-col h-full min-h-0">
      <div className="bg-white shadow-sm border border-border-light p-3 flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between px-2 py-1">
          <h1 className="text-xl font-semibold text-text-main flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <button
            onClick={handleCreateEvent}
            className="bg-primary hover:bg-primary-hover text-white rounded-lg p-2 flex items-center justify-center transition-colors shadow-sm"
            aria-label="Create event"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col px-3 py-3">
          <div className="w-full" style={{ minHeight: 300 }}>
          <style>{`
            .react-calendar {
              border: none !important;
              width: 100% !important;
              background: white !important;
              font-family: inherit !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .react-calendar__navigation {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              margin-bottom: 0.75rem !important;
              height: 36px !important;
              padding: 0 !important;
            }
            .react-calendar__navigation__label {
              font-weight: 500 !important;
              font-size: 0.8125rem !important;
              color: #374151 !important;
              text-align: center !important;
              flex: 1 !important;
              order: 2 !important;
            }
            .react-calendar__navigation button {
              background: none !important;
              border: none !important;
              font-size: 0.95rem !important;
              cursor: pointer !important;
              color: #6B7280 !important;
              padding: 0.35rem !important;
              border-radius: 50% !important;
              transition: all 0.2s !important;
              width: 28px !important;
              height: 28px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .react-calendar__navigation button:hover {
              background: #F3F4F6 !important;
              color: #374151 !important;
            }
            .react-calendar__navigation__prev2-button,
            .react-calendar__navigation__next2-button {
              display: none !important;
            }
            .react-calendar__month-view {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .react-calendar__month-view__weekdays {
              display: grid !important;
              grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              text-align: center !important;
              text-transform: uppercase !important;
              font-size: 0.7rem !important;
              font-weight: 500 !important;
              color: #6B7280 !important;
              letter-spacing: 0.02em !important;
              gap: 0 !important;
              border: none !important;
              box-sizing: border-box !important;
            }
            .react-calendar__month-view__weekdays__weekday {
              padding: 0.35rem 0 !important;
              margin: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              width: 100% !important;
              box-sizing: border-box !important;
              min-width: 0 !important;
            }
            .react-calendar__month-view__weekdays__weekday abbr {
              text-decoration: none !important;
              width: 100% !important;
              display: block !important;
              text-align: center !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .react-calendar__month-view__days {
              display: grid !important;
              grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              row-gap: 0.3rem !important;
              column-gap: 0 !important;
              gap: 0 !important;
              box-sizing: border-box !important;
            }
            .react-calendar__month-view__days__day {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              min-width: 0 !important;
            }
            .react-calendar__month-view__days__day--neighboringMonth,
            .react-calendar__month-view__days__day--neighboringMonth abbr {
              color: #CBD5E1 !important;
            }
            .react-calendar__tile {
              padding: 0 !important;
              margin: 0 auto !important;
              text-align: center !important;
              border-radius: 50% !important;
              font-size: 0.875rem !important;
              color: #374151 !important;
              transition: all 0.2s !important;
              width: 36px !important;
              height: 36px !important;
              min-width: 36px !important;
              max-width: 36px !important;
              flex: none !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
            }
            .react-calendar__tile:enabled:hover {
              background: #F3F4F6 !important;
              border-radius: 50%;
            }
            .react-calendar__tile--now,
            .react-calendar__tile--now:enabled:focus,
            .react-calendar__tile--now:enabled:hover,
            .react-calendar__tile--now.react-calendar__tile--active,
            .react-calendar__tile--now.react-calendar__tile--active:enabled:focus,
            .react-calendar__tile--now.react-calendar__tile--active:enabled:hover {
              background: #FF8C00 !important;
              color: #ffffff !important;
              border-radius: 50%;
              font-weight: 600;
            }
            .react-calendar__tile--now abbr {
              color: #ffffff !important;
            }
            .react-calendar__tile--active,
            .react-calendar__tile--active:enabled:focus,
            .react-calendar__tile--active:enabled:hover {
              background: #FFD8A8 !important;
              color: #FF8C00 !important;
              border-radius: 50%;
              font-weight: 600;
            }
            .calendar-day--event {
              background: #FFD8A8 !important;
              color: #FF8C00 !important;
              border-radius: 50%;
              font-weight: 600;
            }
            .calendar--month-view .react-calendar__tile--active:not(.calendar-day--event):not(.react-calendar__tile--now) {
              background: transparent !important;
              color: #374151 !important;
              font-weight: 500;
            }
          `}</style>

          <Calendar
            className={isMonthView ? "calendar--month-view" : undefined}
            onChange={(date) => {
              const newDate = new Date(date);
              setSelectedDate(newDate);
              setCalendarValue(newDate);

              if (
                newDate.getFullYear() !== activeStartDate.getFullYear() ||
                newDate.getMonth() !== activeStartDate.getMonth()
              ) {
                onMonthChange?.(newDate);
              }

              if (isMonthView) {
                onRequestViewMode?.("week");
              }
            }}
            onActiveStartDateChange={({ activeStartDate: nextStart }) => {
              if (!nextStart) return;
              setActiveStartDate(nextStart);
              onMonthChange?.(nextStart);
            }}
            value={calendarValue}
            activeStartDate={activeStartDate}
            locale="en-US"
            minDetail="month"
            prev2Label={null}
            next2Label={null}
            prevLabel={<ChevronLeft className="w-4 h-4" />}
            nextLabel={<ChevronRight className="w-4 h-4" />}
            navigationLabel={({ date }) => (
              <span className="text-text-main">
                {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            )}
            showNeighboringMonth
            showFixedNumberOfWeeks
            tileClassName={({ date, view }) => {
              if (view === "month") {
                const isToday =
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
                const isSelected =
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();
                const hasEvent = eventDateSet.has(formatDateKey(date));

                if (isToday) return "react-calendar__tile--now";
                if (!isMonthView && isSelected) return "react-calendar__tile--active";
                if (isMonthView && hasEvent) return "calendar-day--event";
              }
              return null;
            }}
          />
        </div>
      </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-text-secondary" />
                <h3 className="text-base font-semibold text-text-main">Departments</h3>
              </div>
              <button
                onClick={toggleAllSelection}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                  isAllSelected
                    ? "bg-bg-hover text-text-main hover:bg-gray-200"
                    : "bg-primary-light text-primary hover:bg-primary-light"
                }`}
              >
                {isAllSelected ? "Clear" : "Select all"}
              </button>
            </div>

          {isLoading ? (
            <div className="text-center py-8 text-text-secondary">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Loading members...</p>
            </div>
          ) : (
            <>

              <div className="space-y-3">
                {groupedEmployees.map((team) => {
                  const isExpanded = expandedTeams.has(team.teamName);
                  const rawColor =
                    departmentNameColorMap.get(team.teamName) || team.color || "";
                  const isCssColor = /^#|^rgb|^hsl|^var\(/i.test(rawColor);
                  const dotStyle = isCssColor && rawColor ? { backgroundColor: rawColor } : undefined;
                  const dotColorClass = !isCssColor && rawColor ? rawColor : "bg-primary";
                  const accentBg = isCssColor ? toRgba(rawColor, 0.08) : null;
                  const accentBorder = isCssColor ? toRgba(rawColor, 0.4) : null;
                  const accentShadow = isCssColor ? toRgba(rawColor, 0.18) : null;
                  const headerStyle = {
                    backgroundColor: accentBg || undefined,
                    borderColor: accentBorder || undefined,
                    boxShadow: accentShadow ? `0 8px 24px -12px ${accentShadow}` : undefined,
                  };

                  return (
                    <div key={team.teamName} className="space-y-1">
                      <div
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl transition-colors shadow-[0_6px_18px_-14px_rgba(0,0,0,0.35)] ${
                          isCssColor ? "border" : "bg-bg-secondary hover:bg-bg-hover"
                        }`}
                        style={headerStyle}
                        onClick={() => toggleTeamExpansion(team.teamName)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className={`w-1.5 h-8 rounded-full ${dotColorClass}`}
                            style={dotStyle}
                          />
                          <h4 className="text-sm font-semibold text-text-main truncate">{team.teamName}</h4>
                        </div>
                        <span className="text-xs text-text-main bg-bg-hover px-2.5 py-0.5 rounded-full">
                          {team.members.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="space-y-1 ml-4">
                          {team.members.map((emp) => (
                            <label
                              key={`${team.teamName}-member-${emp.id}`}
                              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-primary border-border-light rounded focus:ring-primary"
                                checked={selectedMembers.includes(emp.id)}
                                onChange={() => toggleMember(emp.id)}
                              />
                              {emp.avatar ? (
                                <img
                                  src={emp.avatar}
                                  alt={emp.name || "Member"}
                                  className="w-6 h-6 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = avatarFallbackDataUrl(emp.name || "U");
                                  }}
                                />
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-text-main text-xs font-medium">
                                  {(emp.name || "U").charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text-main truncate">
                                  {emp.name || "Unnamed Member"}
                                </div>
                                {emp.email && (
                                  <div className="text-xs text-text-secondary truncate">{emp.email}</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </aside>
);
};

export default SidebarCalendar;
