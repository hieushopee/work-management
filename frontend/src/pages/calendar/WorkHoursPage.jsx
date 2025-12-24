import React, { useState, useEffect, useMemo } from "react";
import axios from "../../libs/axios";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Clock, Calendar, TrendingUp, Users, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CheckCircle2, CircleUserRoundIcon } from "lucide-react";
import useUserStore from "../../stores/useUserStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import useTeamStore from "../../stores/useTeamStore";

const WorkHoursPage = () => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    getAllUsers();
    getAllTeams();
  }, [getAllUsers, getAllTeams]);

  // Display all employees (do not filter by team to have a complete work hours table)
  const visibleEmployees = useMemo(() => {
    return Array.isArray(employees) ? employees : [];
  }, [employees]);

  // Calculate period boundaries
  const periodBoundaries = useMemo(() => {
    if (period === "day") {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      };
    } else if (period === "week") {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      };
    }
  }, [period, selectedDate]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const start = new Date(periodBoundaries.start);
        const end = new Date(periodBoundaries.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const memberIds = visibleEmployees.map((emp) => String(emp.id || emp._id));

        if (memberIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const res = await axios.get("/calendar", {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
            members: memberIds,
          },
        });

        const allEvents = Array.isArray(res.data) ? res.data : [];
        
        setEvents(
          allEvents.map((evt) => ({
            id: evt.id,
            title: evt.title,
            start: new Date(evt.start),
            end: new Date(evt.end),
            assignedTo: Array.isArray(evt.assignedTo) ? evt.assignedTo : [],
            shiftLogs: Array.isArray(evt.shiftLogs)
              ? evt.shiftLogs.map((log) => ({
                  ...log,
                  userId: log.userId,
                  startedAt: log.startedAt ? new Date(log.startedAt) : null,
                  endedAt: log.endedAt ? new Date(log.endedAt) : null,
                  totalMinutes: Number(log.totalMinutes || 0),
                }))
              : [],
          }))
        );
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [periodBoundaries, visibleEmployees]);

  // Calculate work hours per employee
  const workHoursByEmployee = useMemo(() => {
    const startTs = new Date(periodBoundaries.start).getTime();
    const endTs = new Date(periodBoundaries.end).getTime();

    const hoursMap = {};

    visibleEmployees.forEach((emp) => {
      hoursMap[String(emp.id)] = {
        id: String(emp.id),
        name: emp.name || emp.email || "Unknown",
        hours: 0,
        events: 0,
        earlyStartMinutes: 0,
        lateStartMinutes: 0,
        earlyEndMinutes: 0,
        lateEndMinutes: 0,
        startCount: 0,
        endCount: 0,
      };
    });

    events.forEach((evt) => {
      if (!evt) return;
      const scheduledStart = evt.start instanceof Date ? evt.start : new Date(evt.start);
      const scheduledEnd = evt.end instanceof Date ? evt.end : new Date(evt.end);
      if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) return;
      if (!scheduledEnd || Number.isNaN(scheduledEnd.getTime())) return;
      
      const startTime = scheduledStart.getTime();
      if (startTime < startTs || startTime > endTs) return;

      const shiftLogs = Array.isArray(evt.shiftLogs) ? evt.shiftLogs : [];
      shiftLogs.forEach((log) => {
        if (!log || !log.userId) return;

        const userId = String(log.userId);
        if (!hoursMap[userId]) return;

        // Calculate work hours
        const totalMinutes = Number(log.totalMinutes || 0);
        if (totalMinutes > 0) {
          const hrs = totalMinutes / 60;
          if (Number.isFinite(hrs) && hrs > 0) {
            hoursMap[userId].hours += hrs;
            hoursMap[userId].events += 1;
          }
        } else {
          const startedAt = log.startedAt ? new Date(log.startedAt) : null;
          const endedAt = log.endedAt ? new Date(log.endedAt) : null;
          if (startedAt && !Number.isNaN(startedAt.getTime()) && endedAt && !Number.isNaN(endedAt.getTime())) {
            let diffMs = endedAt.getTime() - startedAt.getTime();
            if (diffMs <= 0) {
              diffMs += 24 * 60 * 60 * 1000;
            }
            if (diffMs > 0) {
              const hrs = diffMs / (1000 * 60 * 60);
              if (Number.isFinite(hrs) && hrs > 0) {
                hoursMap[userId].hours += hrs;
                hoursMap[userId].events += 1;
              }
            }
          }
        }

        // Calculate early/late check-in
        const startedAt = log.startedAt ? new Date(log.startedAt) : null;
        if (startedAt && !Number.isNaN(startedAt.getTime())) {
          const scheduledStartTime = scheduledStart.getTime();
          const actualStartTime = startedAt.getTime();
          const diffMinutes = Math.round((actualStartTime - scheduledStartTime) / (1000 * 60));
          
          hoursMap[userId].startCount += 1;
          
          if (diffMinutes < 0) {
            hoursMap[userId].earlyStartMinutes += Math.abs(diffMinutes);
          } else if (diffMinutes > 0) {
            hoursMap[userId].lateStartMinutes += diffMinutes;
          }
        }

        // Calculate early/late check-out
        const endedAt = log.endedAt ? new Date(log.endedAt) : null;
        if (endedAt && !Number.isNaN(endedAt.getTime())) {
          const scheduledEndTime = scheduledEnd.getTime();
          const actualEndTime = endedAt.getTime();
          const diffMinutes = Math.round((actualEndTime - scheduledEndTime) / (1000 * 60));
          
          hoursMap[userId].endCount += 1;
          
          if (diffMinutes < 0) {
            hoursMap[userId].earlyEndMinutes += Math.abs(diffMinutes);
          } else if (diffMinutes > 0) {
            hoursMap[userId].lateEndMinutes += diffMinutes;
          }
        }
      });
    });

    return Object.values(hoursMap)
      .sort((a, b) => b.hours - a.hours)
      .map((item) => ({
        ...item,
        hours: Math.round(item.hours * 10) / 10,
        avgEarlyStart: item.startCount > 0 ? Math.round(item.earlyStartMinutes / item.startCount) : 0,
        avgLateStart: item.startCount > 0 ? Math.round(item.lateStartMinutes / item.startCount) : 0,
        avgEarlyEnd: item.endCount > 0 ? Math.round(item.earlyEndMinutes / item.endCount) : 0,
        avgLateEnd: item.endCount > 0 ? Math.round(item.lateEndMinutes / item.endCount) : 0,
      }));
  }, [events, visibleEmployees, periodBoundaries]);

  const totalHours = useMemo(() => {
    return workHoursByEmployee.reduce((sum, emp) => sum + emp.hours, 0);
  }, [workHoursByEmployee]);

  const averageHours = useMemo(() => {
    return workHoursByEmployee.length > 0 ? totalHours / workHoursByEmployee.length : 0;
  }, [workHoursByEmployee.length, totalHours]);

  const formatPeriod = () => {
    if (period === "day") {
      return format(selectedDate, "d MMM yyyy");
    } else if (period === "week") {
      return `${format(periodBoundaries.start, "d MMM")} - ${format(periodBoundaries.end, "d MMM yyyy")}`;
    } else {
      return format(selectedDate, "MMMM yyyy");
    }
  };

  const navigatePeriod = (direction) => {
    const newDate = new Date(selectedDate);
    if (period === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (period === "week") {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="flex h-full bg-bg-secondary">
      {/* Left Sidebar */}
      <aside className="w-80 border-r border-border-light flex flex-col h-full bg-white">
        <div className="p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main mb-4">Work Hours</h2>
          
          <div className="mb-4">
            <label className="block text-xs font-semibold text-text-main mb-2">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm text-text-main"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-text-main mb-2">Date</label>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => navigatePeriod(-1)}
                className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <span className="font-medium text-text-main text-sm flex-1 text-center">
                {formatPeriod()}
              </span>
              <button
                onClick={() => navigatePeriod(1)}
                className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border-light">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Total Hours</span>
              <span className="text-sm font-semibold text-text-main">{totalHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Average</span>
              <span className="text-sm font-semibold text-text-main">{averageHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Employees</span>
              <span className="text-sm font-semibold text-text-main">{workHoursByEmployee.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-bg-secondary">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-main mb-1">Work Hours Statistics</h1>
            <p className="text-sm text-text-secondary">Track work hours for Noteam and same team members</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-text-secondary">Loading work hours...</p>
              </div>
            </div>
          ) : workHoursByEmployee.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center text-text-secondary">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No work hours data available</p>
                <p className="text-sm text-text-muted mt-1">Work hours will appear here once events are logged</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {workHoursByEmployee.map((emp, index) => {
                const hasStartData = emp.startCount > 0;
                const hasEndData = emp.endCount > 0;
                const isOnTimeStart = hasStartData && emp.avgEarlyStart === 0 && emp.avgLateStart === 0;
                const isOnTimeEnd = hasEndData && emp.avgEarlyEnd === 0 && emp.avgLateEnd === 0;

                // Find employee data to get avatar
                const employeeData = employees.find((e) => String(e.id || e._id) === String(emp.id));
                const employeeAvatar = employeeData?.avatar || null;

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl border border-border-light p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {employeeAvatar ? (
                          <img
                            src={employeeAvatar}
                            alt={emp.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0 shadow-md">
                            <CircleUserRoundIcon className="h-10 w-10 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text-main text-lg">{emp.name}</div>
                          <div className="text-xs text-text-secondary">Rank #{index + 1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{emp.hours.toFixed(1)}</div>
                        <div className="text-xs text-text-secondary">hours</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-bg-secondary rounded-lg p-3">
                        <div className="text-xs text-text-secondary mb-1">Events</div>
                        <div className="text-lg font-semibold text-text-main">{emp.events}</div>
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-3">
                        <div className="text-xs text-text-secondary mb-1">Avg per Event</div>
                        <div className="text-lg font-semibold text-text-main">
                          {emp.events > 0 ? (emp.hours / emp.events).toFixed(1) : 0}h
                        </div>
                      </div>
                    </div>

                    {/* Attendance */}
                    <div className="space-y-3 pt-4 border-t border-border-light">
                      {/* Start Time */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-text-secondary" />
                          <span className="text-xs font-semibold text-text-main uppercase tracking-wide">Start Time</span>
                        </div>
                        {hasStartData ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {isOnTimeStart ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 className="w-3 h-3" />
                                On Time
                              </span>
                            ) : (
                              <>
                                {emp.avgEarlyStart > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                                    <ArrowUp className="w-3 h-3" />
                                    Early {emp.avgEarlyStart}m
                                  </span>
                                )}
                                {emp.avgLateStart > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                                    <ArrowDown className="w-3 h-3" />
                                    Late {emp.avgLateStart}m
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">No data</span>
                        )}
                      </div>

                      {/* End Time */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-text-secondary" />
                          <span className="text-xs font-semibold text-text-main uppercase tracking-wide">End Time</span>
                        </div>
                        {hasEndData ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {isOnTimeEnd ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 className="w-3 h-3" />
                                On Time
                              </span>
                            ) : (
                              <>
                                {emp.avgEarlyEnd > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                                    <ArrowUp className="w-3 h-3" />
                                    Early {emp.avgEarlyEnd}m
                                  </span>
                                )}
                                {emp.avgLateEnd > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                    <ArrowDown className="w-3 h-3" />
                                    Late {emp.avgLateEnd}m
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">No data</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WorkHoursPage;
