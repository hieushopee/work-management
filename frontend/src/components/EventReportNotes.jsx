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
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">Report Notes</div>
          <div className="text-xs text-gray-500">{createdBy} • {formatDateTime(createdAt, false)}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" />
          {formatDateTime(start)}{end ? ` - ${formatDateTime(end)}` : ""}
        </span>
      </div>
      <div className="prose max-w-none text-gray-800 bg-gray-50 rounded-lg p-4 border border-gray-100">
        {reportNotes ? (
          <div dangerouslySetInnerHTML={{ __html: reportNotes }} />
        ) : (
          <span className="text-gray-400 italic">No report notes provided.</span>
        )}
      </div>
    </div>
  );
}
