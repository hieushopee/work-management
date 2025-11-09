import React, { useEffect, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import CameraBox from "./CameraBox";
import RichTextEditor from "./RichTextEditor";
import { startShift as startShiftApi, endShift as endShiftApi } from "../libs/axios";

import { SquarePenIcon, Trash2Icon, X, Calendar, Clock, User, CheckCircle, Camera, Info } from "lucide-react";

const MODAL_WIDTH = 980;
const MODAL_HEIGHT = 200;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function EventModal({
  event = {},
  position = { x: 100, y: 100 },
  onSave,
  onDelete,
  onClose,
  currentUser,
  refreshEvents,
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [pos, setPos] = useState(position);
  const [editing, setEditing] = useState(!event?.id);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [shiftLog, setShiftLog] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftNotice, setShiftNotice] = useState(null);

  const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const modalRef = useRef(null);

  const normalizeShiftLog = (logEntry) => {
    if (!logEntry) return null;
    return {
      ...logEntry,
      userId: logEntry.userId,
      startedAt: logEntry.startedAt ? new Date(logEntry.startedAt) : null,
      endedAt: logEntry.endedAt ? new Date(logEntry.endedAt) : null,
      totalMinutes: Number(logEntry.totalMinutes || 0),
      lateMinutes: Number(logEntry.lateMinutes || 0),
      overtimeMinutes: Number(logEntry.overtimeMinutes || 0),
    };
  };

  const formatDuration = (minutes) => {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const formatDateTime = (value, pattern = "PPpp") => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return "—";
    }
    try {
      return format(value, pattern);
    } catch {
      return "—";
    }
  };

  const updateShiftStateFromEvent = (payload) => {
    if (!payload || !currentUser?.id) {
      setShiftLog(null);
      return;
    }
    const logEntry = Array.isArray(payload.shiftLogs)
      ? payload.shiftLogs.find((log) => String(log.userId) === String(currentUser.id))
      : null;
    setShiftLog(normalizeShiftLog(logEntry));
  };


  useEffect(() => {
    setTitle(event.title || "");
    // HỖ TRỢ cả event.start / event.startDate (vì cả hai dạng có thể xuất hiện)
    try {
      if (event.start) {
        setStart(new Date(event.start));
      } else if (event.startDate) {
        setStart(new Date(event.startDate));
      } else {
        setStart(new Date());
      }
    } catch {
      setStart(new Date());
    }
    try {
      if (event.end) {
        setEnd(new Date(event.end));
      } else if (event.endDate) {
        setEnd(new Date(event.endDate));
      } else {
        setEnd(new Date());
      }
    } catch {
      setEnd(new Date());
    }
    setEditing(!event?.id);
    setTaskDescription(event.taskDescription || "");
    setReportNotes(event.reportNotes || "");
    setShiftNotice(null);

    // Kiểm tra attendance từ dữ liệu event
    if (Array.isArray(event.attendance)) {
      const attended = event.attendance.some(
        (a) => a.userId === currentUser?.id && a.success === true
      );
      setAttendanceSuccess(attended);
    } else {
      setAttendanceSuccess(false);
    }
    updateShiftStateFromEvent(event);
  }, [event?.id, event?.title, event?.start, event?.end, event?.startDate, event?.endDate, event?.attendance, event?.taskDescription, event?.reportNotes, event?.shiftLogs, currentUser?.id]);

  useEffect(() => {
    const recenterModal = () => {
      const modalWidth = modalRef.current?.offsetWidth ?? MODAL_WIDTH;
      const modalHeight = modalRef.current?.offsetHeight ?? MODAL_HEIGHT;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const centeredX = (vw - modalWidth) / 2;
      const centeredY = (vh - modalHeight) / 2;

      setPos({
        x: clamp(centeredX, 16, Math.max(16, vw - modalWidth - 16)),
        y: clamp(centeredY - 140, 16, Math.max(16, vh - modalHeight - 16)),
      });
    };

    recenterModal();
    window.addEventListener("resize", recenterModal);

    return () => {
      window.removeEventListener("resize", recenterModal);
    };
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current.dragging) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const modalWidth = modalRef.current?.offsetWidth || MODAL_WIDTH;
      const modalHeight = modalRef.current?.offsetHeight || MODAL_HEIGHT;
      const nx = clamp(
        e.clientX - dragState.current.offsetX,
        8,
        vw - modalWidth - 8
      );
      const ny = clamp(
        e.clientY - dragState.current.offsetY,
        8,
        vh - modalHeight - 8
      );
      setPos({ x: nx, y: ny });
    };
    const onUp = () => (dragState.current.dragging = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const beginDrag = (e) => {
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current.dragging = true;
    dragState.current.offsetX = e.clientX - rect.left;
    dragState.current.offsetY = e.clientY - rect.top;
  };

  const handleSave = () => {
    if (!title.trim()) return;
    // Trả về cả start/end và startDate/endDate để các phần khác dễ dùng
    const payload = {
      ...event,
      title: title.trim(),
      start: start,
      end: end,
      startDate: start,
      endDate: end,
      taskDescription,
      reportNotes,
    };
    onSave?.(payload);
  };

  const currentUserId = currentUser?.id;
  const isAssignedToEvent = Array.isArray(event?.assignedTo)
    ? event.assignedTo.some((memberId) => String(memberId) === String(currentUserId))
    : false;
  const hasStartedShift = !!(shiftLog && shiftLog.startedAt);
  const hasEndedShift = !!(shiftLog && shiftLog.endedAt);
  const startButtonDisabled =
    shiftLoading || !event?.id || !currentUserId || !isAssignedToEvent || hasStartedShift;
  const endButtonDisabled =
    shiftLoading ||
    !event?.id ||
    !currentUserId ||
    !isAssignedToEvent ||
    !hasStartedShift ||
    hasEndedShift ||
    !attendanceSuccess;
  const startButtonTitle = hasStartedShift
    ? "Shift has already been started"
    : isAssignedToEvent
    ? "Start your shift"
    : "You are not assigned to this event";
  let endButtonTitle = "End your shift";
  if (!hasStartedShift) endButtonTitle = "Start your shift before ending it";
  else if (!attendanceSuccess) endButtonTitle = "Mark attendance before ending shift";
  else if (hasEndedShift) endButtonTitle = "Shift already ended";

  const handleStartShift = async () => {
    const userId = currentUserId;
    if (startButtonDisabled || !event?.id || !userId) return;
    try {
      setShiftLoading(true);
      setShiftNotice(null);
      const response = await startShiftApi(event.id, userId);
      const updatedEvent = response?.event;
      let message = "Shift started successfully.";
      if (updatedEvent) {
        updateShiftStateFromEvent(updatedEvent);
        const logEntry = Array.isArray(updatedEvent.shiftLogs)
          ? updatedEvent.shiftLogs.find((log) => String(log.userId) === String(userId))
          : null;
        if (logEntry?.startedAt) {
          const startedAt = new Date(logEntry.startedAt);
          if (!Number.isNaN(startedAt.getTime())) {
            message = `Shift started at ${formatDateTime(startedAt, "HH:mm")}.`;
          }
          const late = Number(logEntry.lateMinutes || 0);
          if (late > 0) {
            message += ` ${formatDuration(late)} late.`;
          }
        }
      }
      refreshEvents?.();
      setShiftNotice({ type: "success", text: message });
    } catch (err) {
      console.error("[EventModal] handleStartShift error:", err);
      const message =
        err?.response?.data?.message || "Unable to start the shift. Please try again.";
      setShiftNotice({ type: "error", text: message });
    } finally {
      setShiftLoading(false);
    }
  };

  const handleEndShift = async () => {
    const userId = currentUserId;
    if (endButtonDisabled || !event?.id || !userId) return;
    try {
      setShiftLoading(true);
      setShiftNotice(null);
      const response = await endShiftApi(event.id, userId);
      const updatedEvent = response?.event;
      let message = "Shift ended successfully.";
      if (updatedEvent) {
        updateShiftStateFromEvent(updatedEvent);
        const logEntry = Array.isArray(updatedEvent.shiftLogs)
          ? updatedEvent.shiftLogs.find((log) => String(log.userId) === String(userId))
          : null;
        if (logEntry) {
          const total = Number(logEntry.totalMinutes || 0);
          const overtime = Number(logEntry.overtimeMinutes || 0);
          if (total > 0) {
            message = `Shift ended. Logged ${formatDuration(total)}.`;
          }
          if (overtime > 0) {
            message += ` Includes ${formatDuration(overtime)} overtime.`;
          }
        }
      }
      refreshEvents?.();
      setShiftNotice({ type: "success", text: message });
    } catch (err) {
      console.error("[EventModal] handleEndShift error:", err);
      const message =
        err?.response?.data?.message || "Unable to end the shift. Please try again.";
      setShiftNotice({ type: "error", text: message });
    } finally {
      setShiftLoading(false);
    }
  };

  let shiftActionLabel = shiftLoading ? "Processing..." : "Start";
  let shiftActionDisabled = startButtonDisabled;
  let shiftActionTitle = startButtonTitle;
  let shiftActionHandler = shiftActionDisabled ? null : handleStartShift;
  let shiftButtonClass =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700";

  if (shiftActionDisabled) {
    shiftButtonClass =
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 text-gray-500 cursor-not-allowed";
  }

  if (editing) {
    shiftActionLabel = "Save Event";
    shiftActionDisabled = !editing;
    shiftActionTitle = "Save changes";
    shiftActionHandler = null;
    shiftButtonClass =
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white cursor-default";
  } else if (hasStartedShift && !hasEndedShift) {
    shiftActionLabel = shiftLoading ? "Processing..." : "End";
    shiftActionDisabled = endButtonDisabled;
    shiftActionTitle = endButtonTitle;
    shiftActionHandler = shiftActionDisabled ? null : handleEndShift;
    shiftButtonClass = shiftActionDisabled
      ? "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 text-gray-500 cursor-not-allowed"
      : "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700";
  } else if (hasEndedShift) {
    shiftActionLabel = "Ended";
    shiftActionDisabled = true;
    shiftActionTitle = "Shift already ended";
    shiftActionHandler = null;
    shiftButtonClass =
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 text-gray-500 cursor-not-allowed";
  }

  const hasFaceUrl = !!currentUser?.faceUrl?.trim();
  const canOpenCamera = hasFaceUrl && !!event?.id && isToday(start);
  const attendanceStatus = (() => {
    if (attendanceSuccess) {
      return {
        title: "Attendance Confirmed",
        description: "You are marked present for this event.",
        tone: "text-green-600 bg-green-50",
        icon: "check",
      }
    }
    if (canOpenCamera) {
      return {
        title: "Attendance Pending",
        description: "Please mark your attendance when you are ready.",
        tone: "text-amber-600 bg-amber-50",
        icon: "clock",
      }
    }
    if (!event?.id) {
      return {
        title: "Attendance Unavailable",
        description: "Save the event first to enable attendance capture.",
        tone: "text-gray-500 bg-gray-50",
        icon: "info",
      }
    }
    if (!isToday(start)) {
      return {
        title: "Attendance Opens On Event Day",
        description: "Attendance can be marked on the scheduled date.",
        tone: "text-blue-600 bg-blue-50",
        icon: "calendar",
      }
    }
    if (!hasFaceUrl) {
      return {
        title: "Face Data Required",
        description: "Add a face profile in settings to enable attendance.",
        tone: "text-rose-600 bg-rose-50",
        icon: "user",
      }
    }
    return {
      title: "Attendance Pending",
      description: "Attendance is not yet available.",
      tone: "text-gray-500 bg-gray-50",
      icon: "info",
    }
  })();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden="true" />
      <div
          ref={modalRef}
          className="fixed z-50 w-[980px] max-w-[95vw] max-h-[85vh] flex flex-col rounded-lg bg-white shadow-xl border border-gray-200"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Google Calendar style */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-200 cursor-move select-none"
          onMouseDown={beginDrag}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <h2 className="text-lg font-medium text-gray-900">
              {event?.id ? "Event details" : "Create Event"}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {event?.id && (
              <>
                {canOpenCamera && !attendanceSuccess && (
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Mark attendance"
                  >
                    <User className="w-4 h-4" />
                  </button>
                )}
                {attendanceSuccess && (
                  <div className="w-8 h-8 flex items-center justify-center rounded-full text-green-600 bg-green-100">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={() => setEditing(!editing)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  title={editing ? "View mode" : "Edit mode"}
                >
                  <SquarePenIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete?.(event.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                  title="Delete event"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body - Vertical Layout */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 pb-6">
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
                Event Title
              </label>
              <input
                type="text"
                className={`w-full text-lg text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm placeholder:text-gray-400 placeholder:text-base placeholder:font-normal ${
                  !editing ? 'cursor-default bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                readOnly={!editing}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
                  Date
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      className={`w-full pl-10 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm ${
                        !editing ? 'cursor-default bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                      value={format(start, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        newDate.setHours(start.getHours(), start.getMinutes());
                        setStart(newDate);
                      }}
                      readOnly={!editing}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
                  Time
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Start</span>
                    <input
                      type="time"
                      className={`text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm ${
                        !editing ? 'cursor-default bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                      value={format(start, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const newStart = new Date(start);
                        newStart.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        setStart(newStart);
                      }}
                      readOnly={!editing}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">End</span>
                    <input
                      type="time"
                      className={`text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm ${
                        !editing ? 'cursor-default bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                      value={format(end, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const newEnd = new Date(end);
                        newEnd.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        setEnd(newEnd);
                      }}
                      readOnly={!editing}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Attendance
                  </h3>
                  <p className="text-sm text-gray-500">{attendanceStatus.description}</p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${attendanceStatus.tone}`}>
                  {attendanceStatus.icon === 'check' && <CheckCircle className="w-4 h-4" />}
                  {attendanceStatus.icon === 'clock' && <Clock className="w-4 h-4" />}
                  {attendanceStatus.icon === 'calendar' && <Calendar className="w-4 h-4" />}
                  {attendanceStatus.icon === 'user' && <User className="w-4 h-4" />}
                  {attendanceStatus.icon === 'info' && <Info className="w-4 h-4" />}
                  <span>{attendanceStatus.title}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-500">
                  Attendance is captured via camera so that presence is verified accurately.
                </div>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={!canOpenCamera || attendanceSuccess}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !canOpenCamera || attendanceSuccess
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {attendanceSuccess ? 'Attendance Recorded' : 'Mark Attendance'}
                </button>
            </div>
          </div>

            <RichTextEditor
              id="taskDescription"
              label="Task Details"
              labelClassName="text-xs font-bold text-gray-900 uppercase tracking-wide"
              value={taskDescription}
              onChange={setTaskDescription}
              placeholder="Outline the tasks that need to be completed..."
              readOnly={!editing}
              height={240}
            />

            {/* Report Notes Section */}
            <RichTextEditor
              id="reportNotes"
              label="Report Notes"
              labelClassName="text-xs font-bold text-gray-900 uppercase tracking-wide"
              value={reportNotes}
              onChange={editing ? setReportNotes : () => {}}
              placeholder="Add progress notes, blockers, or key updates..."
              readOnly={!editing}
              height={240}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex flex-col gap-2">
            {shiftNotice && (
              <div
                className={`text-sm px-3 py-2 rounded-lg border ${
                  shiftNotice.type === "error"
                    ? "text-red-700 bg-red-50 border-red-200"
                    : "text-green-700 bg-green-50 border-green-200"
                }`}
              >
                {shiftNotice.text}
              </div>
            )}
            {!isAssignedToEvent && event?.id && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg">
                You must be assigned to this event to log shift time.
              </div>
            )}
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Save Event
                  </button>
                </>
              ) : (
                event?.id && (
                  <button
                    type="button"
                    onClick={shiftActionHandler || undefined}
                    disabled={shiftActionDisabled}
                    title={shiftActionTitle}
                    className={shiftButtonClass}
                  >
                    {shiftActionLabel}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {showCamera && canOpenCamera && !attendanceSuccess && (
        <CameraBox
          user={currentUser}
          eventId={event.id}
          onClose={() => setShowCamera(false)}
          onSuccess={() => {
            setAttendanceSuccess(true);
            setShowCamera(false);
            refreshEvents?.();
          }}
        />
      )}
    </>
  );
};
