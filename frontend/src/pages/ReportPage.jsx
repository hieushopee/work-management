import React, { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "../libs/axios"
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { X, Calendar, Clock, FileText } from "lucide-react"

const ReportPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const memberId = searchParams.get("memberId")
  const period = searchParams.get("period") || "week"
  const dateParam = searchParams.get("date")
  
  const [member, setMember] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const initialDaySetRef = useRef(false)

  const selectedDate = dateParam ? new Date(dateParam) : new Date()

  // Calculate period boundaries
  const periodBoundaries = useMemo(() => {
    if (period === "day") {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate),
      }
    } else if (period === "week") {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      }
    } else {
      // month
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }
    }
  }, [period, selectedDate])

  // Group events by date and sort events by start time within each date
  const eventsByDate = useMemo(() => {
    const grouped = {}
    events.forEach((event) => {
      const dateKey = format(event.start, "yyyy-MM-dd")
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: event.start,
          events: [],
        }
      }
      grouped[dateKey].events.push(event)
    })
    
    // Sort dates and sort events within each date by start time
    return Object.keys(grouped)
      .sort()
      .map((key) => ({
        ...grouped[key],
        events: grouped[key].events.sort((a, b) => a.start.getTime() - b.start.getTime())
      }))
  }, [events])

  // Get sorted dates for left sidebar
  const dateList = useMemo(() => {
    return eventsByDate.map((group) => group.date)
  }, [eventsByDate])

  // Get all events for selected day
  const selectedDayAllEvents = useMemo(() => {
    if (!selectedDay) return []
    const group = eventsByDate.find((g) => isSameDay(g.date, selectedDay))
    return group ? group.events : []
  }, [selectedDay, eventsByDate])

  // Set initial selected day and event when dateList changes
  useEffect(() => {
    if (dateList.length > 0) {
      // If period is month, select first day of month, otherwise select from selectedDate
      let initialDate
      if (period === "month") {
        initialDate = startOfMonth(selectedDate)
      } else {
        initialDate = startOfDay(selectedDate)
      }
      
      // Find the closest date in the list (or first date if none match)
      const found = dateList.find((d) => isSameDay(d, initialDate))
      const newSelectedDay = found || dateList[0]
      
      // Only set if selectedDay is not set or if it's not in the current dateList
      const shouldUpdate = !selectedDay || !dateList.some((d) => isSameDay(d, selectedDay))
      
      if (shouldUpdate) {
        setSelectedDay(newSelectedDay)
        initialDaySetRef.current = true
      }
    } else {
      // No dates available, reset selectedDay and selectedEvent
      setSelectedDay(null)
      setSelectedEvent(null)
      initialDaySetRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateList.length, period, selectedDate.getTime()]) // Only depend on length and primitive values

  // Set initial selected event when selectedDay changes
  useEffect(() => {
    if (selectedDayAllEvents.length > 0 && !selectedEvent) {
      // Select first event of the day
      setSelectedEvent(selectedDayAllEvents[0])
    } else if (selectedDayAllEvents.length === 0) {
      setSelectedEvent(null)
    } else if (selectedEvent && !selectedDayAllEvents.find((e) => e.id === selectedEvent.id)) {
      // If current selected event is not in the new list, select first event
      setSelectedEvent(selectedDayAllEvents[0] || null)
    }
  }, [selectedDayAllEvents, selectedEvent])

  // Fetch employee list
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data } = await axios.get("/employees/all")
        setEmployees(Array.isArray(data.users) ? data.users : [])
      } catch {
        setEmployees([])
      }
    }
    loadEmployees()
  }, [])

  // Get member info
  useEffect(() => {
    if (!memberId || employees.length === 0) return
    
    const foundMember = employees.find((e) => String(e.id) === String(memberId))
    setMember(foundMember || null)
  }, [memberId, employees])

  // Fetch events with ended shifts for this member
  useEffect(() => {
    if (!memberId) {
      setLoading(false)
      return
    }

    const fetchEvents = async () => {
      setLoading(true)
      try {
        const start = new Date(periodBoundaries.start)
        const end = new Date(periodBoundaries.end)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)

        const res = await axios.get("/calendar", {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
            members: [memberId],
          },
        })

        const allEvents = Array.isArray(res.data) ? res.data : []
        
        // Filter events that have ended shifts for this member
        const endedEvents = allEvents.filter((evt) => {
          const shiftLogs = Array.isArray(evt.shiftLogs) ? evt.shiftLogs : []
          // Check if there's a shift log with endedAt for this member
          return shiftLogs.some(
            (log) =>
              String(log.userId) === String(memberId) && log.endedAt
          )
        })

        // Map all ended events (including those without report notes)
        const allEndedEvents = endedEvents.map((evt) => {
          const shiftLog = Array.isArray(evt.shiftLogs)
            ? evt.shiftLogs.find((log) => String(log.userId) === String(memberId))
            : null

          return {
            id: evt.id,
            title: evt.title,
            start: new Date(evt.start),
            end: new Date(evt.end),
            reportNotes: evt.reportNotes || "",
            reportAttachments: Array.isArray(evt.reportAttachments) ? evt.reportAttachments : [],
            endedAt: shiftLog?.endedAt ? new Date(shiftLog.endedAt) : null,
            startedAt: shiftLog?.startedAt ? new Date(shiftLog.startedAt) : null,
          }
        })

        setEvents(allEndedEvents)
      } catch (error) {
        console.error("Failed to fetch events:", error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [memberId, period, selectedDate.getTime()]) // Use primitive values instead of periodBoundaries object

  const formatPeriod = () => {
    if (period === "day") {
      return format(selectedDate, "d MMM yyyy")
    } else if (period === "week") {
      return `${format(periodBoundaries.start, "d MMM yyyy")} - ${format(periodBoundaries.end, "d MMM yyyy")}`
    } else {
      return format(selectedDate, "MMMM yyyy")
    }
  }

  const handleClose = () => {
    navigate(-1)
  }

  if (!memberId) {
    return (
      <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <p className="text-gray-600">No member selected</p>
            <button
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const memberName = member?.name || member?.email || "Unknown Member"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={handleClose} aria-hidden="true" />
      <div
        className="fixed z-50 w-[980px] max-w-[95vw] max-h-[85vh] flex rounded-lg bg-white shadow-xl border border-gray-200"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar - Date and Event List */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : dateList.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No reports available
              </div>
            ) : (
              <div className="py-2">
                {eventsByDate.map((dateGroup) => {
                  const date = dateGroup.date
                  return (
                    <div key={date.toISOString()} className="mb-1">
                      {/* Events for this date */}
                      {dateGroup.events.map((event) => {
                        const isSelected = selectedEvent?.id === event.id
                        return (
                          <button
                            key={event.id}
                            onClick={() => {
                              setSelectedDay(date)
                              setSelectedEvent(event)
                            }}
                            className={`w-full text-left px-3 py-2 transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-900 font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {/* Line 1: Day, Date: Start Time - End Time */}
                            <div className="text-xs text-gray-600">
                              {format(event.start, "EEEE, d MMM yyyy")}: {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                            </div>
                            {/* Line 2: Event Title */}
                            <div className={`text-sm mt-0.5 ${isSelected ? "font-semibold text-blue-900" : "font-medium text-gray-900"}`}>
                              {event.title}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Report Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{memberName}</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Work reports for {formatPeriod()}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center text-gray-500">Loading report...</div>
            ) : !selectedEvent ? (
              <div className="text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Select an event to view report</p>
              </div>
            ) : (
              <div>
                {/* Event Title */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {selectedEvent.title}
                </h3>

                {/* Date and Time Range */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(selectedEvent.start, "EEEE, d MMM yyyy")} | {format(selectedEvent.start, "HH:mm")} - {format(selectedEvent.end, "HH:mm")}
                  </span>
                </div>

                {/* Report Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                    Report Notes
                  </label>
                  {selectedEvent.reportNotes && selectedEvent.reportNotes.trim() !== "" ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200"
                      style={{ fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: selectedEvent.reportNotes }}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-gray-500 italic">
                      Please create report notes for this event.
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {selectedEvent.reportAttachments && selectedEvent.reportAttachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                      Attachments
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.reportAttachments.map((attachment, idx) => (
                        <a
                          key={idx}
                          href={attachment.url || attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {attachment.name || attachment || `Attachment ${idx + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ReportPage