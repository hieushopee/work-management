// File: src/pages/CalendarPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "../libs/axios";
import SidebarCalendar from "../components/SidebarCalendar";
import WeeklySchedule from "../components/WeeklySchedule";
import EventModal from "../components/EventModal";

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalEvent, setModalEvent] = useState(null);
  const [modalPos, setModalPos] = useState({ x: 100, y: 100 });
  const [monthlyEvents, setMonthlyEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [viewMode, setViewMode] = useState("week");

  const fetchMonthlyEvents = useCallback((date) => {
    if (selectedMembers.length === 0) {
      setMonthlyEvents([]);
      return;
    }

    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    axios
      .get("/calendar", {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
          members: selectedMembers,
        },
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setMonthlyEvents(
          list.map((evt) => ({
            ...evt,
            start: new Date(evt.start),
            end: new Date(evt.end),
          }))
        );
      })
      .catch(() => setMonthlyEvents([]));
  }, [selectedMembers]);

  const calendarRef = useRef(null);
  const isLoading = employees === null;

  // Get user info (ensure faceUrl included)
  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await axios.get("/auth/me");
      let user = res.data || null;

      if (user && !user.faceUrl) {
        try {
          const empRes = await axios.get(`/employees/${user.id}`);
          if (empRes.data?.employee) {
            user = { ...user, ...empRes.data.employee };
          }
        } catch {
          console.warn("⚠️ Unable to fetch additional faceUrl info from employees");
        }
      }

      setCurrentUser(user);
      console.log("✅ CurrentUser loaded successfully");
    } catch (err) {
      console.log("❌ Failed to load currentUser");
      if (err.response?.status === 401) {
        try {
          await axios.post("/auth/refresh-token");
          const res = await axios.get("/auth/me");
          setCurrentUser(res.data || null);
          console.log("✅ CurrentUser reloaded successfully after refresh");
        } catch {
          alert("Please log in again.");
        }
      }
    }
  };
  fetchUser();
}, []);

  // Get employee list
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data } = await axios.get("/employees/all");
        setEmployees(Array.isArray(data.users) ? data.users : []);
      } catch {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, []);

  // Get departments (for sidebar color tags)
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await axios.get("/departments");
        setDepartments(Array.isArray(data) ? data : []);
      } catch {
        setDepartments([]);
      }
    };
    loadDepartments();
  }, []);

  // Get events by week (1 person) or day (multiple people)
  const fetchEvents = useCallback(() => {
    if (selectedMembers.length === 0) {
      setEvents([]);
      return;
    }

    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    axios
      .get("/calendar", {
        params: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
          members: selectedMembers,
        },
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEvents(
          list.map((evt) => ({
            id: evt.id,
            title: evt.title,
            start: new Date(evt.start),
            end: new Date(evt.end),
            resourceId: evt.assignedTo,
            assignedTo: Array.isArray(evt.assignedTo) ? evt.assignedTo : [],
            createdById: evt.createdById,
            attendance: Array.isArray(evt.attendance) ? evt.attendance : [],
            shiftLogs: Array.isArray(evt.shiftLogs)
              ? evt.shiftLogs.map((log) => ({
                  ...log,
                  userId: log.userId,
                  startedAt: log.startedAt ? new Date(log.startedAt) : null,
                  endedAt: log.endedAt ? new Date(log.endedAt) : null,
                  totalMinutes: Number(log.totalMinutes || 0),
                  lateMinutes: Number(log.lateMinutes || 0),
                  overtimeMinutes: Number(log.overtimeMinutes || 0),
                }))
              : [],
            taskDescription: evt.taskDescription || '',
            reportNotes: evt.reportNotes || '',
            reportAttachments: Array.isArray(evt.reportAttachments) ? evt.reportAttachments : [],
          }))
        );
      })
      .catch(() => setEvents([]));
  }, [selectedDate, selectedMembers]);

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, selectedMembers, fetchEvents]);

  useEffect(() => {
    fetchMonthlyEvents(selectedDate);
  }, [selectedDate, selectedMembers, fetchMonthlyEvents]);

  // --- API HANDLERS ---
  const createEvent = async (eventData) => {
    const {
      start,
      end,
      assignedTo = [],
      title = '',
      taskDescription = '',
      reportNotes = '',
      reportFiles = [],
    } = eventData || {};

    if (!Array.isArray(assignedTo) || assignedTo.length !== 1) {
      alert('Please select exactly 1 member to create an event.');
      return;
    }

    if (!currentUser?.id) {
      alert('User information is not ready. Please try again in a moment.');
      return;
    }

    if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
      alert('Invalid time range.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('start', start.toISOString());
      formData.append('end', end.toISOString());
      assignedTo.forEach((memberId) => formData.append('assignedTo', memberId));
      formData.append('taskDescription', taskDescription);
      formData.append('reportNotes', reportNotes);

      if (currentUser) {
        formData.append('createdById', currentUser.id || '');
        formData.append('createdByName', currentUser.name || '');
        formData.append('createdByEmail', currentUser.email || '');
      }

      (reportFiles || []).forEach((file) => {
        if (file) {
          formData.append('reportFiles', file);
        }
      });

      await axios.post('/calendar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchEvents();
      fetchMonthlyEvents(selectedDate);
    } catch (error) {
      console.error('createEvent error:', error);
      alert('❌ Failed to create event.');
    }
  };

  // Open modal for creating new event
  const openCreateEventModal = (eventData) => {
    const {
      start,
      end,
      assignedTo = [],
      title = '',
      taskDescription = '',
      reportNotes = '',
      reportAttachments = [],
    } = eventData || {};

    setModalEvent({
      start,
      end,
      assignedTo,
      title,
      taskDescription,
      reportNotes,
      reportAttachments,
    });
    setModalPos({
      x: window.innerWidth / 2 - 400,
      y: window.innerHeight / 2 - 100,
    });
  };

  const updateEvent = async (evt) => {
    if (!evt?.id) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', evt.title || '');
      formData.append('start', evt.start.toISOString());
      formData.append('end', evt.end.toISOString());
      (evt.assignedTo || []).forEach((memberId) => formData.append('assignedTo', memberId));
      formData.append('taskDescription', evt.taskDescription || '');
      formData.append('reportNotes', evt.reportNotes || '');

      if (Array.isArray(evt.attachmentsToRemove) && evt.attachmentsToRemove.length) {
        formData.append('removeAttachmentIds', JSON.stringify(evt.attachmentsToRemove));
      }

      (evt.reportFiles || []).forEach((file) => {
        if (file) {
          formData.append('reportFiles', file);
        }
      });

      await axios.put(`/calendar/${evt.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchEvents();
      fetchMonthlyEvents(selectedDate);
    } catch (error) {
      console.error('updateEvent error:', error);
      alert('❌ Failed to update event.');
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await axios.delete(`/calendar/${id}`);
      fetchEvents();
      fetchMonthlyEvents(selectedDate);
    } catch {
      alert("❌ Failed to delete event.");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 px-5 py-5">
      <div className="h-full flex gap-5 items-start">
        <div className="w-[320px] shrink-0 px-3 pt-3 ml-4 mt-2">
          <div className="h-full rounded-2xl bg-white shadow-sm border border-border-light overflow-hidden p-3">
            <SidebarCalendar
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              employees={employees}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              isLoading={isLoading}
              currentUser={currentUser}
              onCreateEvent={openCreateEventModal}
              events={monthlyEvents}
              onMonthChange={fetchMonthlyEvents}
              isMonthView={viewMode === "month"}
              onRequestViewMode={setViewMode}
              departments={departments}
            />
          </div>
        </div>

        <div className="flex-1 rounded-2xl bg-white shadow-sm border border-border-light overflow-hidden">
          <WeeklySchedule
            calendarRef={calendarRef}
            events={events}
            selectedMembers={selectedMembers}
            selectedDate={selectedDate}
            employees={employees}
            currentUser={currentUser}
            onCreateEvent={createEvent}
            onEditEvent={updateEvent}
            onDeleteEvent={deleteEvent}
            handleSelectDate={setSelectedDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            refreshEvents={fetchEvents}
          />
        </div>
      </div>

      {modalEvent && (
        <EventModal
          event={modalEvent}
          position={modalPos}
          onSave={(evt) => {
            if (evt.id) {
              updateEvent(evt)
            } else {
              createEvent(evt.start, evt.end, evt.assignedTo, evt.title)
            }
            setModalEvent(null)
          }}
          onDelete={(id) => {
            deleteEvent(id)
            setModalEvent(null)
          }}
          onClose={() => setModalEvent(null)}
          currentUser={currentUser}
          refreshEvents={fetchEvents}
        />
      )}
    </div>
  );
};

export default CalendarPage;

