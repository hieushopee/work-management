import React, { useState, useEffect, useMemo } from "react";
import axios from "../../libs/axios";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { Calendar, Clock, FileText, User, ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle } from "lucide-react";
import useUserStore from "../../stores/useUserStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { hasOwnerPermissions } from "../../utils/roleUtils";

const ReportPage = () => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMember, setSelectedMember] = useState("all");

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  // Get available members
  const availableMembers = useMemo(() => {
    if (hasOwnerPermissions(user)) {
      return employees || [];
    } else {
      return employees?.filter(emp => String(emp.id) === String(user?.id)) || [];
    }
  }, [user, employees]);

  // Calculate month boundaries
  const monthBoundaries = useMemo(() => {
    return {
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate),
    };
  }, [selectedDate]);

  // Fetch all events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const start = new Date(monthBoundaries.start);
        const end = new Date(monthBoundaries.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        let memberIds = [];
        if (selectedMember === "all") {
          memberIds = availableMembers.map(emp => String(emp.id));
        } else {
          memberIds = [selectedMember];
        }

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
        
        const allEventsWithData = allEvents.map((evt) => ({
          id: evt.id,
          title: evt.title || "Untitled Event",
          start: new Date(evt.start),
          end: new Date(evt.end),
          reportNotes: evt.reportNotes || "",
          reportAttachments: Array.isArray(evt.reportAttachments) ? evt.reportAttachments : [],
          assignedTo: Array.isArray(evt.assignedTo) ? evt.assignedTo : [],
          createdById: evt.createdById,
          createdByName: evt.createdByName,
        }));

        setEvents(allEventsWithData);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [monthBoundaries, selectedMember, availableMembers]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    
    events.forEach((event) => {
      const dateKey = format(event.start, "yyyy-MM-dd");
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: event.start,
          dateKey,
          events: [],
        };
      }
      grouped[dateKey].events.push(event);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].events.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  // Get events for selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, "yyyy-MM-dd");
    const dayGroup = eventsByDate.find((group) => group.dateKey === dateKey);
    return dayGroup ? dayGroup.events : [];
  }, [selectedDay, eventsByDate]);

  // Set initial selected day
  useEffect(() => {
    if (eventsByDate.length > 0 && !selectedDay) {
      setSelectedDay(eventsByDate[0].date);
    } else if (eventsByDate.length === 0) {
      setSelectedDay(null);
      setSelectedEvent(null);
    }
  }, [eventsByDate, selectedDay]);

  // Set initial selected event
  useEffect(() => {
    if (selectedDayEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(selectedDayEvents[0]);
    } else if (selectedDayEvents.length === 0) {
      setSelectedEvent(null);
    } else if (selectedEvent && !selectedDayEvents.find((e) => e.id === selectedEvent.id)) {
      setSelectedEvent(selectedDayEvents[0] || null);
    }
  }, [selectedDayEvents, selectedEvent]);

  const getMemberName = (memberId) => {
    const member = employees?.find((emp) => String(emp.id) === String(memberId));
    return member?.name || member?.email || "Unknown";
  };

  const navigateMonth = (direction) => {
    setSelectedDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const formatMonth = () => {
    return format(selectedDate, "MMMM yyyy");
  };

  return (
    <div className="flex h-full bg-bg-secondary">
      {/* Left Sidebar - Dates List */}
      <aside className="w-80 border-r border-border-light flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main mb-4">Report</h2>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </button>
            <span className="font-medium text-text-main text-sm">
              {formatMonth()}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Member Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-text-main mb-2">Member</label>
            <select
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
                setSelectedDay(null);
                setSelectedEvent(null);
              }}
              className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-sm text-text-main"
            >
              <option value="all">All Members</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name || member.email || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>{eventsByDate.length} days</span>
            <span>•</span>
            <span>{events.length} events</span>
          </div>
        </div>

        {/* Dates List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
          ) : eventsByDate.length === 0 ? (
            <div className="p-4 text-center text-text-secondary text-sm">No events this month</div>
          ) : (
            <div className="p-2">
              {eventsByDate.map((dayGroup) => {
                const isSelected = selectedDay && isSameDay(dayGroup.date, selectedDay);
                const hasReports = dayGroup.events.some(e => e.reportNotes && e.reportNotes.trim() !== "");
                
                return (
                  <button
                    key={dayGroup.dateKey}
                    onClick={() => setSelectedDay(dayGroup.date)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                      isSelected
                        ? "bg-primary-50 text-primary border border-primary-200"
                        : "text-text-main hover:bg-bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                        <div>
                          <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text-main'}`}>
                            {format(dayGroup.date, "d MMM")}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {format(dayGroup.date, "EEEE")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">
                          {dayGroup.events.length}
                        </span>
                        {hasReports && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-bg-secondary">
        {!selectedDay ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-text-secondary">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Select a date to view events</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Day Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-main mb-1">
                {format(selectedDay, "EEEE, d MMMM yyyy")}
              </h2>
              <p className="text-sm text-text-secondary">
                {selectedDayEvents.length} registered event{selectedDayEvents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Events List */}
            {loading ? (
              <div className="text-center text-text-secondary py-12">
                <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p>Loading events...</p>
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center text-text-secondary py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No events for this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  const hasReport = event.reportNotes && event.reportNotes.trim() !== "";
                  
                  return (
                    <div
                      key={event.id}
                      className={`bg-white border rounded-xl overflow-hidden transition-all ${
                        isSelected
                          ? "border-indigo-500 shadow-lg"
                          : "border-border-light hover:border-border-light hover:shadow-md"
                      }`}
                    >
                      {/* Event Header */}
                      <div
                        onClick={() => setSelectedEvent(isSelected ? null : event)}
                        className="p-4 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-text-main">
                                {event.title}
                              </h3>
                              {hasReport ? (
                                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Has Report
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold bg-bg-hover text-text-secondary rounded-full flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  No Report
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-text-muted" />
                                <span>
                                  {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                                </span>
                              </div>
                              {event.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-4 h-4 text-text-muted" />
                                  <span>
                                    {event.assignedTo.map(id => getMemberName(id)).join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Event Details (Expanded) */}
                      {isSelected && (
                        <div className="px-4 pb-4 border-t border-border-light bg-bg-secondary">
                          <div className="pt-4">
                            <label className="block text-xs font-bold text-text-main uppercase tracking-wide mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Report Notes
                            </label>
                            {hasReport ? (
                              <div
                                className="prose prose-sm max-w-none text-text-main bg-white rounded-lg p-4 border border-border-light"
                                dangerouslySetInnerHTML={{ __html: event.reportNotes }}
                              />
                            ) : (
                              <div className="bg-white rounded-lg p-4 border border-border-light text-text-secondary italic">
                                No report notes provided for this event.
                              </div>
                            )}
                          </div>
                          {event.reportAttachments && event.reportAttachments.length > 0 && (
                            <div className="mt-4">
                              <label className="block text-xs font-bold text-text-main uppercase tracking-wide mb-3">
                                Attachments
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {event.reportAttachments.map((attachment, attIdx) => (
                                  <a
                                    key={attIdx}
                                    href={attachment.url || attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-primary hover:text-primary-hover hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
                                  >
                                    <FileText className="w-4 h-4" />
                                    {attachment.name || attachment || `Attachment ${attIdx + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportPage;
