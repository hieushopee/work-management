
import React, { useEffect, useMemo, useState } from "react";
import OverlayModal from "./OverlayModal";
import { FileText, X } from "lucide-react";

// reports: [{ id, title, reportNotes, start, end, createdBy, createdAt }]
export default function ReportNotesModal({
  open,
  onClose,
  reports = [],
  memberName = "",
  preferredDate = null,
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedReport = reports[selectedIdx] || {};
  const hasReports = reports.length > 0;

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const d1 = a instanceof Date ? a : new Date(a);
    const d2 = b instanceof Date ? b : new Date(b);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  useEffect(() => {
    if (!reports.length) {
      setSelectedIdx(0);
      return;
    }
    if (preferredDate) {
      const matchIdx = reports.findIndex((r) => isSameDay(r.start, preferredDate));
      if (matchIdx >= 0) {
        setSelectedIdx(matchIdx);
        return;
      }
    }
    setSelectedIdx(0);
  }, [reports, preferredDate]);

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

  const formatFullStamp = (start, end) => {
    const dateLabel = formatDate(start);
    const timeLabel = formatTime(start, end);
    if (!dateLabel && !timeLabel) return "";
    if (!dateLabel) return timeLabel;
    if (!timeLabel) return dateLabel;
    return `${dateLabel} | ${timeLabel}`;
  };

  const periodLabel = useMemo(() => {
    const baseDate = selectedReport?.start || reports[0]?.start;
    if (!baseDate) return "";
    const d = new Date(baseDate);
    if (!d || Number.isNaN(d.getTime())) return "";
    return `Work report for ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }, [selectedReport?.start, reports]);

  return (
    <OverlayModal open={open} onClose={onClose} width={960}>
      <div className="flex h-[640px] max-h-[85vh] w-[960px] max-w-full flex-col overflow-hidden rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-border-light bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-main">{memberName || "Report notes"}</h2>
              <p className="text-sm text-text-secondary">{periodLabel || "Work reports"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-light text-text-secondary hover:text-text-main hover:border-border-light hover:bg-bg-secondary transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden bg-bg-secondary">
          {/* Sidebar */}
          <aside className="w-72 border-r border-border-light bg-white/80 p-4 overflow-y-auto">
            {hasReports ? (
              <ul className="space-y-2">
                {reports.map((r, idx) => {
                  const isActive = idx === selectedIdx;
                  return (
                    <li key={r.id || idx}>
                      <button
                        type="button"
                        onClick={() => setSelectedIdx(idx)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-blue-200 bg-blue-50 text-blue-700 shadow-inner"
                            : "border-transparent bg-white text-text-main hover:border-blue-100 hover:bg-blue-50/40"
                        }`}
                      >
                        <div className="text-xs font-semibold text-text-secondary">
                          {formatFullStamp(r.start, r.end)}
                        </div>
                        <div className="text-sm font-semibold text-text-main truncate">
                          {r.title || "(No title)"}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-text-secondary px-1 py-6 text-center">
                No reports available for this member.
              </div>
            )}
          </aside>

          {/* Detail panel */}
          <section className="flex-1 overflow-y-auto p-6">
            {hasReports ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-border-light">
                <div className="mb-5">
                  <h3 className="text-2xl font-semibold text-text-main">
                    {selectedReport.title || "(No title)"}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatFullStamp(selectedReport.start, selectedReport.end)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border-light bg-bg-secondary/80 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-main">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Report Notes
                  </div>
                  <div className="min-h-[200px] rounded-xl bg-white/80 p-4 text-sm leading-relaxed text-text-main border border-border-light">
                    {selectedReport.reportNotes ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedReport.reportNotes }}
                      />
                    ) : (
                      <p className="italic text-text-muted">No report notes provided for this event.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border-light bg-white text-sm text-text-secondary">
                Select a report from the list to view its notes.
              </div>
            )}
          </section>
        </div>
      </div>
    </OverlayModal>
  );
}
