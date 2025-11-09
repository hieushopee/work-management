// src/components/SidebarCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
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
}) => {
  const [expandedTeams, setExpandedTeams] = useState(() => new Set());
  const [calendarValue, setCalendarValue] = useState(selectedDate);
  const [activeStartDate, setActiveStartDate] = useState(selectedDate);
  const today = useMemo(() => new Date(), []);

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

    const currentUserTeams = currentUser?.teamNames || [];
    const filtered = list.filter((emp) => {
      if (emp.id === currentUser?.id) return true;
      if (currentUserTeams.length > 0 && Array.isArray(emp.teamNames) && emp.teamNames.length > 0) {
        return emp.teamNames.some((team) => currentUserTeams.includes(team));
      }
      return currentUser?.role === "owner" || currentUser?.role === "admin";
    });

    const teamsMap = new Map();
    filtered.forEach((emp) => {
      const teams = Array.isArray(emp.teamNames) && emp.teamNames.length > 0 ? emp.teamNames : ["No Team"];
      teams.forEach((teamName) => {
        if (!teamsMap.has(teamName)) {
          teamsMap.set(teamName, []);
        }
        const bucket = teamsMap.get(teamName);
        if (!bucket.some((member) => member.id === emp.id)) {
          bucket.push(emp);
        }
      });
    });

    return Array.from(teamsMap.entries())
      .map(([teamName, members]) => ({
        teamName,
        members: members.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [employees, currentUser]);

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
    <aside className="w-[17rem] mr-4 bg-white flex flex-col h-full min-h-0">
      <div className="flex flex-col items-center px-4 pt-4 gap-4">
        <div className="w-full max-w-[266px] flex items-center justify-between">
          <h1 className="text-xl font-normal text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Calendar
          </h1>

          <button
            onClick={handleCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        <div className="w-full max-w-[266px]" style={{ minHeight: 300 }}>
          <style>{`
            .react-calendar {
              border: none !important;
              width: 100%;
              background: white;
              font-family: inherit;
            }
            .react-calendar__navigation {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 0.75rem;
              height: 36px;
            }
            .react-calendar__navigation__label {
              font-weight: 500;
              font-size: 0.8125rem;
              color: #374151;
              text-align: center;
              flex: 1;
              order: 2;
            }
            .react-calendar__navigation button {
              background: none !important;
              border: none;
              font-size: 0.95rem;
              cursor: pointer;
              color: #6B7280;
              padding: 0.35rem;
              border-radius: 50%;
              transition: all 0.2s;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .react-calendar__navigation button:hover {
              background: #F3F4F6 !important;
              color: #374151;
            }
            .react-calendar__navigation__prev2-button,
            .react-calendar__navigation__next2-button {
              display: none !important;
            }
            .react-calendar__month-view__weekdays {
              display: grid;
              grid-template-columns: repeat(7, 38px);
              width: 266px;
              margin: 0 auto 0.35rem auto;
              text-align: center;
              text-transform: uppercase;
              font-size: 0.7rem;
              font-weight: 500;
              color: #6B7280;
              letter-spacing: 0.02em;
            }
            .react-calendar__month-view__weekdays__weekday {
              padding: 0.35rem 0;
              display: flex;
              justify-content: center;
            }
            .react-calendar__month-view__days {
              display: grid;
              grid-template-columns: repeat(7, 38px);
              width: 266px;
              margin: 0 auto;
              row-gap: 0.3rem;
            }
            .react-calendar__month-view__days__day {
              width: 38px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .react-calendar__month-view__days__day--neighboringMonth,
            .react-calendar__month-view__days__day--neighboringMonth abbr {
              color: #CBD5E1 !important;
            }
            .react-calendar__tile {
              padding: 0 !important;
              text-align: center;
              border-radius: 50%;
              font-size: 0.875rem;
              color: #374151;
              transition: all 0.2s;
              width: 38px !important;
              height: 38px !important;
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
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
              background: #2563EB !important;
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
              background: #EFF6FF !important;
              color: #2563EB !important;
              border-radius: 50%;
              font-weight: 600;
            }
            .calendar-day--event {
              background: #EFF6FF !important;
              color: #2563EB !important;
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
              <span className="text-gray-900">
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
        <div className="w-full max-w-[266px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Team Members</h3>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Loading members...</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-3">
                <button
                  onClick={selectAll}
                  className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  None
                </button>
              </div>

              <div className="space-y-3">
                {groupedEmployees.map((team) => {
                  const isExpanded = expandedTeams.has(team.teamName);
                  return (
                    <div key={team.teamName} className="space-y-1">
                      <div
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => toggleTeamExpansion(team.teamName)}
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <h4 className="text-sm font-semibold text-gray-700 flex-1">{team.teamName}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {team.members.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="space-y-1 ml-4">
                          {team.members.map((emp) => (
                            <label
                              key={`${team.teamName}-member-${emp.id}`}
                              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                                  {(emp.name || "U").charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {emp.name || "Unnamed Member"}
                                </div>
                                {emp.email && (
                                  <div className="text-xs text-gray-500 truncate">{emp.email}</div>
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
    </aside>
  );
};

export default SidebarCalendar;
