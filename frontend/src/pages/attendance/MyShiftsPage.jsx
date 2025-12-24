import React, { useEffect, useState, useMemo } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchMyShifts } from "../../api/attendance";
import useUserStore from "../../stores/useUserStore";
import useEmployeeStore from "../../stores/useEmployeeStore";

const MyShiftsPage = () => {
  const { user } = useUserStore();
  const role = (user?.role || "staff").toLowerCase();
  const myId = String(user?._id || user?.id || "");
  const { employees, getAllEmployees } = useEmployeeStore();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("self");

  useEffect(() => {
    if ((role === "manager" || role === "admin") && !employees) {
      getAllEmployees?.();
    }
  }, [role, employees, getAllEmployees]);

  const memberOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    if (role === "manager" && user?.department) {
      return list.filter(
        (e) => (e.department || e.departmentName || e.dept || "").trim() === (user.department || "").trim()
      );
    }
    return list;
  }, [employees, role, user?.department]);

  const memberLookup = useMemo(() => {
    const map = {};
    (memberOptions || []).forEach((m) => {
      const id = String(m._id || m.id || m.userId || "");
      if (id) map[id] = m;
    });
    return map;
  }, [memberOptions]);

  const selectedUser =
    selectedUserId === "self"
      ? user
      : memberLookup[selectedUserId] || memberOptions.find((m) => String(m._id || m.id) === selectedUserId);

  const toLocalDateKey = (val) => {
    if (!val) return "";
    const d = val instanceof Date ? new Date(val) : new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  };

  // Get week range (Mon-Sun)
  const weekRange = useMemo(() => {
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeek]);

  const startStr = toLocalDateKey(weekRange[0]);
  const endStr = toLocalDateKey(weekRange[6]);

  const load = async () => {
    setLoading(true);
    try {
      const targetUserId = selectedUserId === "self" ? myId : selectedUserId;
      const paramsUserIds = targetUserId ? [targetUserId] : [];
      const data = await fetchMyShifts(startStr, endStr, {
        userIds: paramsUserIds.length ? paramsUserIds : undefined,
      });
      const normalized = Array.isArray(data) ? data : [];
      const filtered = paramsUserIds.length
        ? normalized.filter(
            (a) => paramsUserIds.includes(String(a.user?._id || a.user?.id || a.user || a.userId || ""))
          )
        : normalized;
      setAssignments(filtered);
    } catch (err) {
      console.error("Load my shifts error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [startStr, endStr, user, selectedUserId]);

  const prevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(prev);
  };

  const nextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(next);
  };

  const thisWeek = () => {
    setCurrentWeek(new Date());
  };

  const formatDate = (d) => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const getShiftForDate = (date) => {
    const dateKey = toLocalDateKey(date);
    return assignments.find((a) => toLocalDateKey(a.date) === dateKey);
  };

  const formatTime = (minutes) => {
    if (minutes == null) return "--:--";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">
            {selectedUserId === "self" ? "My Shifts" : `Shifts · ${selectedUser?.name || selectedUser?.email || "Employee"}`}
          </h1>
          <p className="text-text-secondary">
            {role === "manager" || role === "admin"
              ? "View your shifts or your team members' shifts."
              : "View your assigned shift schedule."}
          </p>
          {(role === "manager" || role === "admin") && (
            <div className="flex items-center gap-2 mt-2 text-sm text-text-main">
              <span>Employee</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="self">Me</option>
                {memberOptions.map((m) => {
                  const id = String(m._id || m.id || m.userId || "");
                  return (
                    <option key={id} value={id}>
                      {m.name || m.email || "No name"}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg border border-border-light bg-white hover:bg-bg-secondary text-text-main"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={thisWeek}
            className="px-4 py-2 rounded-lg border border-border-light bg-white hover:bg-bg-secondary text-sm font-medium text-text-main"
          >
            This Week
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg border border-border-light bg-white hover:bg-bg-secondary text-text-main"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-main">
                Week {startStr.slice(8, 10)}/{startStr.slice(5, 7)} - {endStr.slice(8, 10)}/{endStr.slice(5, 7)}/{endStr.slice(0, 4)}
              </h2>
              <p className="text-sm text-text-secondary">Shift Schedule</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-secondary">Loading...</div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {weekRange.map((date, idx) => {
              const assignment = getShiftForDate(date);
              const shift = assignment?.shift;
              const isToday =
                date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${
                    isToday ? "border-indigo-500 bg-primary-50" : "border-border-light bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold text-text-main mb-2">{formatDate(date)}</div>
                  {shift ? (
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-primary">{shift.name}</div>
                      <div className="text-xs text-text-secondary">
                        {formatTime(shift.startMinutes)} - {formatTime(shift.endMinutes)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted">No shift</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShiftsPage;





