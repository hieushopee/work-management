
import React, { useState } from "react";
import OverlayModal from "./OverlayModal";
import EventReportNotes from "./EventReportNotes";

// reports: [{ id, title, reportNotes, start, end, createdBy, createdAt }]
export default function ReportNotesModal({ open, onClose, reports = [], memberName = "" }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedReport = reports[selectedIdx] || {};

  // Helper to format event time (e.g. 02:00 - 12:00)
  const formatTime = (start, end) => {
    try {
      const s = start ? new Date(start) : null;
      const e = end ? new Date(end) : null;
      if (!s) return "";
      const sTime = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const eTime = e ? e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return eTime ? `${sTime} - ${eTime}` : sTime;
    } catch {
      return "";
    }
  };

  // Helper to format event date (e.g. Thu, 30 Oct 2025)
  const formatDate = (date) => {
    try {
      const d = date ? new Date(date) : null;
      if (!d) return "";
      return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <OverlayModal open={open} onClose={onClose} width={900}>
      <div className="flex h-[600px] max-h-[80vh] w-[900px] max-w-full">
        {/* Sidebar: List of events */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto rounded-l-xl">
          <div className="font-semibold text-gray-700 mb-4">{memberName}</div>
          <ul className="space-y-2">
            {reports.map((r, idx) => (
              <li key={r.id || idx}>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                    idx === selectedIdx
                      ? "bg-blue-100 text-blue-700 shadow"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-base truncate">{r.title || "(No title)"}</span>
                    <span className="text-xs text-gray-500">{formatDate(r.start)}</span>
                    <span className="text-xs text-gray-500">{formatTime(r.start, r.end)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Main content: Report notes for selected event */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">{selectedReport.title}</div>
            <div className="text-sm text-gray-500 mb-2">{formatDate(selectedReport.start)} | {formatTime(selectedReport.start, selectedReport.end)}</div>
          </div>
          <EventReportNotes {...selectedReport} />
        </div>
      </div>
    </OverlayModal>
  );
}
