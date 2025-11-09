import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns"
import ReportNotesModal from "./ReportNotesModal";
import EventModal from "./EventModal"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3X3, List, Clock, CalendarDays, ChevronDown } from "lucide-react"

const HOUR_HEIGHT_REM = 1.5
const STEP_HOURS = 2
const SLOT_HEIGHT_REM = HOUR_HEIGHT_REM * STEP_HOURS


const WeeklySchedule = ({
  calendarRef,
  events,
  selectedMembers,
  selectedDate,
  handleSelectDate,
  employees,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  currentUser,
  refreshEvents,
  viewMode: controlledViewMode,
  onViewModeChange,
}) => {
  const [localViewMode, setLocalViewMode] = useState('week')
  const viewMode = controlledViewMode ?? localViewMode
  const setViewMode = onViewModeChange ?? setLocalViewMode
  
  // Period mode for work hours summary (day/week/month) - independent from viewMode
  const [periodMode, setPeriodMode] = useState('week')

  // State for report modal overlay
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportList, setReportList] = useState([]);
  const [reportMember, setReportMember] = useState("");
  
  // Track previous view mode to determine behavior when switching to day view
  const previousViewModeRef = useRef(viewMode)
  
  // Update previous view mode whenever viewMode changes
  useEffect(() => {
    previousViewModeRef.current = viewMode
  }, [viewMode])
  // Nhãn thời gian: 0,2,4,...,22
  const timeLabels = Array.from({ length: 24 / STEP_HOURS }, (_, i) => i * STEP_HOURS)
  const slotStarts = timeLabels

  const normalizeColKey = (key) =>
    key instanceof Date ? key.toISOString() : String(key)

  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [modalEvent, setModalEvent] = useState(null)
  const [modalPos, setModalPos] = useState(null)
  const [nowPos, setNowPos] = useState(null)

  const isMultiMember = selectedMembers.length > 1
  const currentUserId = currentUser?.id != null ? String(currentUser.id) : null
  const isSelfOnlySelected = useMemo(() => {
    if (!currentUserId) return false
    if (selectedMembers.length !== 1) return false
    return String(selectedMembers[0]) === currentUserId
  }, [currentUserId, selectedMembers])
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })

  // Calculate period boundaries based on period mode
  const periodBoundaries = useMemo(() => {
    if (periodMode === 'day') {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      }
    } else if (periodMode === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      }
    } else { // month
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }
    }
  }, [periodMode, selectedDate])

  // compute work hours per selected member based on period mode
  const workHoursByMember = useMemo(() => {
    const startBoundary = new Date(periodBoundaries.start);
    startBoundary.setHours(0, 0, 0, 0);
    const endBoundary = new Date(periodBoundaries.end);
    endBoundary.setHours(23, 59, 59, 999);

    const startTs = startBoundary.getTime();
    const endTs = endBoundary.getTime();

    const hoursMap = {};
    selectedMembers.forEach((id) => {
      hoursMap[String(id)] = 0;
    });

    const accumulate = (userId, minutes) => {
      const key = String(userId);
      if (hoursMap[key] === undefined) return;
      const hrs = minutes / 60;
      if (Number.isFinite(hrs) && hrs > 0) {
        hoursMap[key] += hrs;
      }
    };

    events.forEach((evt) => {
      if (!evt) return;

      const scheduledStart = evt.start instanceof Date ? evt.start : new Date(evt.start);
      if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) return;
      const startTime = scheduledStart.getTime();
      if (startTime < startTs || startTime > endTs) return;

      const shiftLogs = Array.isArray(evt.shiftLogs) ? evt.shiftLogs : [];
      shiftLogs.forEach((log) => {
        if (!log || !log.userId) return;

        const totalMinutes = Number(log.totalMinutes || 0);
        if (totalMinutes > 0) {
          accumulate(log.userId, totalMinutes);
          return;
        }

        const startedAt = log.startedAt ? new Date(log.startedAt) : null;
        const endedAt = log.endedAt ? new Date(log.endedAt) : null;
        if (!startedAt || !endedAt || Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
          return;
        }

        let diffMs = endedAt.getTime() - startedAt.getTime();
        if (diffMs <= 0) {
          diffMs += 24 * 60 * 60 * 1000;
        }
        if (diffMs > 0) {
          accumulate(log.userId, diffMs / (1000 * 60));
        }
      });
    });

    return hoursMap;
  }, [events, selectedMembers, periodBoundaries]);

  const formatHours = (hours) => {
    const value = Number(hours || 0);
    if (!Number.isFinite(value) || value <= 0) return "0h";

    const rounded = Math.round(value * 10) / 10;
    if (Number.isInteger(rounded)) {
      return `${Math.trunc(rounded)}h`;
    }

  const formatted = rounded.toFixed(1).replace(".", ",");
  return `${formatted}h`;
};

  const eventDatesSet = useMemo(() => {
    const set = new Set();
    events.forEach((evt) => {
      if (!evt) return;
      const eventDate = evt.start instanceof Date ? evt.start : new Date(evt.start);
      if (!(eventDate instanceof Date) || Number.isNaN(eventDate.getTime())) return;
      set.add(`${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`);
    });
    return set;
  }, [events]);

  const updateSelectedDate = (date, options = {}) => {
    handleSelectDate(date);
    if (options.fromUserClick && viewMode === 'month') {
      setViewMode('week');
    }
  };

  // Keep selectedDate unchanged when switching views
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  // Auto switch view based on member selection
  useEffect(() => {
    if (isMultiMember) {
      // Multiple members selected - switch to day view
      if (viewMode === 'month' || viewMode === 'week') {
        const previousViewMode = previousViewModeRef.current;
        setViewMode('day');
        
        // If coming from month view, set selectedDate to today
        // If coming from week view, keep the current selectedDate
        if (previousViewMode === 'month') {
          handleSelectDate(new Date()); // Set to today
        }
        // If from week view, selectedDate stays the same (no action needed)
      }
    } else if (selectedMembers.length === 1) {
      // Single member selected - switch to week view
      if (viewMode === 'day') {
        setViewMode('week')
      }
    }
  }, [isMultiMember, selectedMembers.length, viewMode, setViewMode, handleSelectDate])

  // Dynamic title based on view mode and member selection
  const getTitle = () => {
    if (isMultiMember) {
      // When multiple members selected, show selected date
      return format(selectedDate, "EEEE, MMMM d, yyyy")
    } else if (viewMode === 'day') {
      // Day view - show selected date
      return format(selectedDate, "EEEE, MMMM d, yyyy")
    } else if (viewMode === 'week') {
      const wsMonth = format(weekStart, "MMM")
      const weMonth = format(weekEnd, "MMM")
      const wsYear = format(weekStart, "yyyy")
      const weYear = format(weekEnd, "yyyy")
      return wsYear === weYear
        ? (wsMonth === weMonth ? `${wsMonth} ${wsYear}` : `${wsMonth} - ${weMonth} ${wsYear}`)
        : `${wsMonth} ${wsYear} - ${weMonth} ${weYear}`
    } else {
      // Month view
      return format(selectedDate, "MMMM yyyy")
    }
  }
  
  const monthTitle = getTitle()

  // Auto scroll gần giờ hiện tại
  useEffect(() => {
    if (calendarRef?.current) {
      if (isMultiMember && isToday(selectedDate)) {
        // Only auto-scroll to current time if selected date is today
        const nowHour = new Date().getHours()
        const offset = (nowHour - 2) * HOUR_HEIGHT_REM * 16 // -2h để canh giữa
        calendarRef.current.scrollTop = Math.max(offset, 0)
      } else if (!isMultiMember) {
        // For single member mode, always scroll to current time
        const nowHour = new Date().getHours()
        const offset = (nowHour - 2) * HOUR_HEIGHT_REM * 16 // -2h để canh giữa
        calendarRef.current.scrollTop = Math.max(offset, 0)
      }
    }
  }, [calendarRef, selectedDate, isMultiMember])

  // Tính vị trí đường đỏ theo phút
  useEffect(() => {
    const updateNowLine = () => {
      const now = new Date()
      const pos = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT_REM * 16 // px
      setNowPos(pos)
    }
    updateNowLine()
    const interval = setInterval(updateNowLine, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!modalEvent?.id) return
    const updated = events.find((evt) => evt.id === modalEvent.id)
    if (updated) {
      setModalEvent((prev) => (prev ? { ...prev, ...updated } : prev))
    }
  }, [events, modalEvent?.id])

  // Bắt đầu kéo
  const handleMouseDown = (colKey, hourStart) => {
    if (isMultiMember) return
    const slot = { colKey, keyValue: normalizeColKey(colKey), hour: hourStart }
    setDragStart(slot)
    setDragEnd(slot)
  }

  // Kết thúc kéo -> mở modal tạo event
  const handleMouseUp = (colKey) => {
    if (isMultiMember) return

    if (!dragStart || !dragEnd) {
      setDragStart(null)
      setDragEnd(null)
      return
    }

    const colKeyValue = normalizeColKey(colKey)

    if (
      dragStart.keyValue !== colKeyValue ||
      dragEnd.keyValue !== colKeyValue
    ) {
      setDragStart(null)
      setDragEnd(null)
      return
    }

    // Check if selected member is the current user
    if (selectedMembers.length === 0 || selectedMembers[0] !== currentUser?.id) {
      setDragStart(null)
      setDragEnd(null)
      return
    }

    const startHour = Math.min(dragStart.hour, dragEnd.hour)
    const endHour = Math.max(dragStart.hour, dragEnd.hour) + STEP_HOURS

    const start = new Date(colKey)
    start.setHours(startHour, 0, 0, 0)

    const end = new Date(colKey)
    end.setHours(endHour, 0, 0, 0)

    const assignedTo = selectedMembers.length ? [selectedMembers[0]] : []
    if (assignedTo.length) {
      setModalEvent({ start, end, assignedTo })
       setModalPos({ 
         x: window.innerWidth / 2 - 400, 
         y: window.innerHeight / 2 - 100 
       })
    }

    setDragStart(null)
    setDragEnd(null)
  }

  const goToday = () => {
    if (calendarRef?.current) {
      const nowHour = new Date().getHours()
      const offset = (nowHour - 2) * HOUR_HEIGHT_REM * 16
      calendarRef.current.scrollTop = Math.max(offset, 0)
    }
    updateSelectedDate(new Date(), { fromUserClick: true })
  }

  const goNext = () => {
    if (isMultiMember) {
      // Multi-member mode: navigate by day
      updateSelectedDate(addDays(selectedDate, 1))
    } else if (viewMode === 'day') {
      // Day view: navigate by day
      updateSelectedDate(addDays(selectedDate, 1))
    } else if (viewMode === 'week') {
      updateSelectedDate(addDays(selectedDate, 7))
    } else {
      // Month view
      const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
      updateSelectedDate(nextMonth)
    }
  }
  
  const goPrev = () => {
    if (isMultiMember) {
      // Multi-member mode: navigate by day
      updateSelectedDate(addDays(selectedDate, -1))
    } else if (viewMode === 'day') {
      // Day view: navigate by day
      updateSelectedDate(addDays(selectedDate, -1))
    } else if (viewMode === 'week') {
      updateSelectedDate(addDays(selectedDate, -7))
    } else {
      // Month view
      const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
      updateSelectedDate(prevMonth)
    }
  }

  const renderHeader = () => {
    if (!isMultiMember) {
      let headerDays;
      if (viewMode === 'day') {
        // Day view - show only selected date
        headerDays = [selectedDate];
      } else if (viewMode === 'week') {
        headerDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
      } else {
        // Month view
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();
        headerDays = Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1));
      }

      const shouldHighlightEvents = viewMode === 'month';

      return (
        <>
          <div className="w-16 text-center font-medium py-3 border-r border-gray-200 bg-gray-50 text-gray-600">
            <Clock className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs">Time</div>
          </div>
          {headerDays.map((day, i) => {
            const dow = format(day, "EEE");
            const dayNum = format(day, "d");
            const today = isToday(day);
            const selected = isSameDay(day, selectedDate);
            const hasEvents = eventDatesSet.has(
              `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            );
            const isThisMonth = day.getMonth() === selectedDate.getMonth();
            
            // Month view logic: Only show Today and Event days (ignore selected date)
            const highlightEvent = shouldHighlightEvents && hasEvents && !today;

            return (
              <div
                key={i}
                className={`flex-1 text-center py-3 border-r border-gray-200 cursor-pointer transition-colors ${
                  today ? "bg-blue-50/50 hover:bg-blue-50/60" : highlightEvent ? "bg-blue-50/30" : "hover:bg-gray-50"
                }`}
                onClick={() => updateSelectedDate(day, { fromUserClick: true })}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    today ? "text-blue-600 font-semibold" : isThisMonth ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {dow}
                </div>
                <div className="flex justify-center items-center">
                  <div
                    className={`w-8 h-8 rounded-full aspect-square flex items-center justify-center text-sm font-medium transition-all ${
                      today
                        ? "bg-blue-600 text-white font-semibold shadow-sm hover:!bg-blue-600 hover:!text-white"
                        : highlightEvent
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        : !shouldHighlightEvents && selected
                        ? "bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100"
                        : "hover:bg-gray-100 text-gray-900"
                    }`}
                    style={today ? { backgroundColor: '#2563EB', color: '#ffffff' } : undefined}
                    onMouseEnter={(e) => {
                      if (today) {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (today) {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                  >
                    {dayNum}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )
    }

    return (
      <>
        <div className="w-16 text-center font-medium py-3 border-r border-gray-200 bg-gray-50 text-gray-600">
          <Clock className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs">Time</div>
        </div>
        {selectedMembers.map((id, idx) => {
          // find employee by id, fallback to currentUser if available
          const emp = employees?.find((e) => e.id === id) ||
            (currentUser && currentUser.id === id ? currentUser : null)
          return (
            <div
              key={`header-member-${id}-${idx}`}
              className="flex-1 text-center font-medium py-3 border-r border-gray-200 bg-gray-50 text-gray-900"
              title={emp?.email || ""}
            >
              <div className="text-sm truncate px-2">{emp?.name || "Member"}</div>
            </div>
          )
        })}
      </>
    )
  }

  const renderColumns = () => {
    const isMonthView = !isMultiMember && viewMode === 'month';

    let colKeys;
    if (isMultiMember) {
      colKeys = selectedMembers;
    } else if (viewMode === 'day') {
      // Day view - show only selected date
      colKeys = [selectedDate];
    } else if (viewMode === 'week') {
      colKeys = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    } else {
      // Month view - show all days of the month
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();
      colKeys = Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1));
    }

    const totalHeightRem = timeLabels.length * SLOT_HEIGHT_REM

    return (
      <>
        {/* Cột giờ */}
        <div
          className="w-16 border-r border-gray-200 bg-white"
          style={{ height: `${totalHeightRem}rem` }}
        >
          {timeLabels.map((h) => (
            <div
              key={h}
              className="border-b border-gray-100 text-xs text-gray-500 flex items-start justify-center pt-1"
              style={{ height: `${SLOT_HEIGHT_REM}rem` }}
            >
              {`${h}:00`}
            </div>
          ))}
        </div>

        {/* Các cột chính */}
        {colKeys.map((colKey, idx) => {
          const colEvents = events.filter((evt) => {
            if (isMultiMember) {
              return (
                Array.isArray(evt.resourceId) &&
                evt.resourceId.includes(colKey) &&
                isSameDay(evt.start, selectedDate)
              )
            }
            return (
              isSameDay(evt.start, colKey) &&
              Array.isArray(evt.resourceId) &&
              selectedMembers.length === 1 &&
              evt.resourceId.includes(selectedMembers[0])
            )
          })
          const sortedEvents = colEvents
            .slice()
            .sort(
              (a, b) =>
                (a.start instanceof Date ? a.start.getTime() : new Date(a.start).getTime()) -
                (b.start instanceof Date ? b.start.getTime() : new Date(b.start).getTime())
            )

          const columnKeyValue = normalizeColKey(colKey)

          const isDragging =
            dragStart?.keyValue === columnKeyValue &&
            dragEnd?.keyValue === columnKeyValue

          const dragFrom = isDragging ? Math.min(dragStart.hour, dragEnd.hour) : null
          const dragTo = isDragging ? Math.max(dragStart.hour, dragEnd.hour) : null

          const isCurrentDay = !isMultiMember && isToday(colKey)
          const isSelectedDay = isSameDay(colKey, selectedDate)

          return (
            <div
              key={isMultiMember ? `member-${colKey}-${idx}` : `date-${idx}`}
              className={`flex-1 border-r border-gray-100 relative transition-colors ${
                isMonthView 
                  ? isCurrentDay
                    ? 'bg-blue-50/30'
                    : 'hover:bg-gray-50/50'
                  : isCurrentDay
                  ? 'bg-blue-50/30'
                  : isSelectedDay
                  ? 'bg-blue-50/20'
                  : 'hover:bg-gray-50/50'
              }`}
              style={{ height: `${totalHeightRem}rem` }}
              onMouseUp={() => handleMouseUp(colKey)}
            >
              {slotStarts.map((h) => (
                <div
                  key={h}
                  className={`border-b border-gray-100 text-xs px-2 cursor-pointer hover:bg-blue-50/30 transition-colors ${
                    isDragging && h >= dragFrom && h <= dragTo ? "bg-blue-100" : ""
                  }`}
                  style={{ height: `${SLOT_HEIGHT_REM}rem` }}
                  onMouseDown={() => handleMouseDown(colKey, h)}
                  onMouseEnter={() => {
                    if (dragStart) {
                      setDragEnd({ colKey, keyValue: normalizeColKey(colKey), hour: h })
                    }
                  }}
                />
              ))}

              {/* Event */}
          {sortedEvents.map((evt) => {
            const startH = evt.start.getHours() + evt.start.getMinutes() / 60
            let endH = evt.end.getHours() + evt.end.getMinutes() / 60
            if (endH === 0 && evt.end.getMinutes() === 0) {
              endH = 24
            }

            const topRem = startH * HOUR_HEIGHT_REM
            const heightRem = Math.max((endH - startH) * HOUR_HEIGHT_REM, 0.75)
            const durationHours = endH - startH
            const isShortEvent = durationHours < 2
            const isMonthView = !isMultiMember && viewMode === 'month'
            const isSelectedDay = isSameDay(colKey, selectedDate)

            const isOwner =
              Array.isArray(evt.resourceId) &&
              currentUser?.id &&
              evt.resourceId.includes(currentUser.id)

            const endLabel = evt.end.getHours() === 0 && evt.end.getMinutes() === 0 ? '24:00' : format(evt.end, 'HH:mm')
            const timeLabel = `${format(evt.start, 'HH:mm')} - ${endLabel}`
            const rawTitle = typeof evt.title === 'string' && evt.title.trim().length > 0 ? evt.title.trim() : 'Untitled event'

            const shortTitleLimit = 12
            const shortDisplayTitle = rawTitle.length > shortTitleLimit
              ? `${rawTitle.slice(0, shortTitleLimit)}...`
              : `${rawTitle} ${timeLabel}`

            const longTitleLimit = 28
            const displayTitle = rawTitle.length > longTitleLimit ? `${rawTitle.slice(0, longTitleLimit)}...` : rawTitle
            return (
              <div
                key={evt.id}
                className={
                  isMonthView
                    ? 'absolute left-1 right-1 rounded-md bg-blue-500/90 hover:bg-blue-500 transition-all cursor-pointer'
                    : `absolute left-1 right-1 text-xs rounded-md px-2 py-1.5 shadow-sm cursor-pointer border-l-4 transition-all hover:shadow-md flex flex-col ${
                        isShortEvent ? 'justify-center' : 'justify-start gap-0.5'
                      } ${
                        isOwner
                          ? 'bg-blue-50 text-blue-900 border-blue-500 hover:bg-blue-100'
                          : 'bg-gray-50 text-gray-700 border-gray-400 hover:bg-gray-100'
                      }`
                }
                style={{
                  top: `${topRem}rem`,
                  height: `${isMonthView ? Math.max(heightRem, 0.35) : heightRem}rem`,
                  zIndex: 10,
                }}
                onClick={() => {
                  if (isOwner) {
                    setModalEvent(evt)
                    setModalPos({
                      x: window.innerWidth / 2 - 400,
                      y: window.innerHeight / 2 - 100,
                    })
                  }
                }}
              >
                {isMonthView
                  ? null
                  : isShortEvent ? (
                    <div className="font-medium leading-tight text-xs truncate">
                      {shortDisplayTitle}
                    </div>
                  ) : (
                    <>
                      <div className="font-medium leading-tight text-sm truncate">
                        {displayTitle}
                      </div>
                      <div className="text-xs opacity-75 leading-tight">
                        {timeLabel}
                      </div>
                    </>
                  )}
              </div>
            )
          })}

{/* Current time indicator */}
{isCurrentDay && nowPos !== null && (
  <div
    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
    style={{ top: `${nowPos}px` }}
  >
    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
    <div className="flex-1 h-0.5 bg-red-500" />
  </div>
)}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <main className="flex-1 flex flex-col relative bg-white border-l border-gray-200 h-full min-h-0">
      {/* Google Calendar style header - Fixed height to prevent layout shift */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white h-[72px] min-h-[72px] max-h-[72px] flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Navigation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={goToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>

          {/* Date display */}
          <h2 className="text-xl font-normal text-gray-900 min-w-0">
            {monthTitle}
          </h2>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleViewModeChange('month')}
            disabled={isMultiMember}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : isMultiMember
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
            title={isMultiMember ? "Month view not available with multiple members" : "Month view"}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('week')}
            disabled={isMultiMember}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : isMultiMember
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
            title={isMultiMember ? "Week view not available with multiple members" : "Week view"}
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('day')}
            disabled={selectedMembers.length === 0 || isSelfOnlySelected}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'day'
                ? 'bg-white text-gray-900 shadow-sm'
                : (selectedMembers.length === 0 || isSelfOnlySelected)
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
            title={
              selectedMembers.length === 0
                ? "Select at least one member to use day view"
                : isSelfOnlySelected
                  ? "Day view is disabled when viewing only your calendar"
                  : "Day view"
            }
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid - Fixed structure to prevent layout shift */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Fixed header */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          {renderHeader()}
        </div>
        {/* Scrollable calendar content */}
        <div
          ref={calendarRef}
          className="flex-1 flex overflow-y-auto overflow-x-hidden min-h-0 relative bg-white no-scrollbar"
        >
          {renderColumns()}
        </div>

        {/* Work Hours Summary - Fixed at bottom, doesn't affect calendar scroll */}
        {selectedMembers && selectedMembers.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 w-full flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Work Hours Statistics</h3>
              <div className="relative">
                <select
                  value={periodMode}
                  onChange={(e) => setPeriodMode(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {selectedMembers.map((id) => {
                const key = String(id)
                const emp = employees?.find((e) => String(e.id) === key) || { name: "Unknown" }
                const displayName = emp.name || emp.email || "Member"
                const totalHours = workHoursByMember[key] || 0
                return (
                  <div
                    key={`wh-${id}`}
                    onClick={() => {
                      const memberId = String(id);
                      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                      monthStart.setHours(0, 0, 0, 0);
                      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                      monthEnd.setHours(23, 59, 59, 999);

                      const memberEvents = events
                        .filter((evt) => {
                          if (!evt) return false;
                          const eventStart =
                            evt.start instanceof Date ? evt.start : new Date(evt.start);
                          if (!eventStart || Number.isNaN(eventStart.getTime())) return false;
                          if (eventStart < monthStart || eventStart > monthEnd) return false;

                          const assigned = Array.isArray(evt.resourceId)
                            ? evt.resourceId.map((value) => String(value))
                            : Array.isArray(evt.assignedTo)
                            ? evt.assignedTo.map((value) => String(value))
                            : evt.resourceId != null
                            ? [String(evt.resourceId)]
                            : [];

                          return assigned.includes(memberId);
                        })
                        .sort(
                          (a, b) =>
                            (a.start instanceof Date ? a.start.getTime() : new Date(a.start).getTime()) -
                            (b.start instanceof Date ? b.start.getTime() : new Date(b.start).getTime())
                        )
                        .map((evt) => ({
                          id: evt.id,
                          title: evt.title || "(No title)",
                          reportNotes: evt.reportNotes || "",
                          start: evt.start,
                          end: evt.end,
                          createdBy: evt.createdBy || evt.createdById || displayName,
                          createdAt: evt.createdAt || evt.start,
                        }));

                      setReportList(memberEvents);
                      setReportMember(displayName);
                      setShowReportModal(true);
                    }}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate pr-2" title={displayName}>
                      {displayName.length > 22 ? `${displayName.slice(0, 22)}...` : displayName}
                    </span>
                    <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                      {formatHours(totalHours)}
                    </span>
                  </div>
                )
              })}
      {/* Report Notes Modal Overlay - 2 column style */}
      <ReportNotesModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        reports={reportList}
        memberName={reportMember}
        preferredDate={selectedDate}
      />
            </div>
          </div>
        )}

      </div>


      {modalEvent && (
        <EventModal
          event={modalEvent}
          position={modalPos}
          onSave={(evt) => {
            if (evt.id) {
              onEditEvent(evt)
            } else {
              onCreateEvent(evt)
            }
            setModalEvent(null)
          }}
          onDelete={(id) => {
            onDeleteEvent(id)
            setModalEvent(null)
          }}
          onClose={() => setModalEvent(null)}
          currentUser={currentUser}
          refreshEvents={refreshEvents}
        />
      )}
    </main>
  )
}

export default WeeklySchedule
