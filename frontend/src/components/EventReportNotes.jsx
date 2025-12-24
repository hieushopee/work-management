import React from "react";
import { Calendar, Clock } from "lucide-react";

export default function EventReportNotes({
  reportNotes = "",
  start,
  end,
  createdBy,
  createdAt,
}) {
  // Format dates as strings for display
  const formatDateTime = (val, withTime = true) => {
    if (!val) return "";
    try {
      const d = typeof val === "string" ? new Date(val) : val;
      return d.toLocaleString(undefined, withTime ? { dateStyle: "full", timeStyle: "short" } : { dateStyle: "full" });
    } catch {
      return String(val);
    }
  };
  return (
    <div className="rounded-2xl border border-border-light bg-white shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <div className="text-lg font-semibold text-text-main">Report Notes</div>
          <div className="text-xs text-text-secondary">{createdBy} • {formatDateTime(createdAt, false)}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-text-muted" />
          {formatDateTime(start)}{end ? ` - ${formatDateTime(end)}` : ""}
        </span>
      </div>
      <div className="prose max-w-none text-text-main bg-bg-secondary rounded-lg p-4 border border-border-light">
        {reportNotes ? (
          <div dangerouslySetInnerHTML={{ __html: reportNotes }} />
        ) : (
          <span className="text-text-muted italic">No report notes provided.</span>
        )}
      </div>
    </div>
  );
}
