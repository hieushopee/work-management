import React, { useEffect, useMemo, useState } from "react";
import { Download, Filter, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { fetchLogs } from "../../api/attendance";

const SummaryDetailPage = () => {
  const now = useMemo(() => new Date(), []);
  const [start, setStart] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchLogs(`${start}T00:00:00.000Z`, `${end}T23:59:59.999Z`);
      const logs = Array.isArray(data) ? data : [];
      const grouped = new Map();
      logs.forEach((log) => {
        const userId = log.user?._id || log.user?.id || log.user;
        if (!userId) return;
        const existing = grouped.get(userId) || {
          code: log.user?.employeeCode || log.user?.code || "—",
          name: log.user?.name || log.user?.email || "—",
          dept: log.user?.department?.name || log.user?.department || "—",
          late: 0,
          lateNoReason: 0,
          early: 0,
          checkout: 0,
        };
        if ((log.lateMinutes || 0) > 0) {
          existing.late += 1;
          existing.lateNoReason += 1; // No leave application data yet, temporarily duplicated
        }
        if ((log.earlyMinutes || 0) > 0) existing.early += 1;
        if (log.checkout?.time) existing.checkout += 1;
        grouped.set(userId, existing);
      });
      setRows(Array.from(grouped.values()));
    } catch (err) {
      console.error("Load summary detail error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [start, end]);

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Detailed Analytics</h1>
          <p className="text-text-secondary">Detailed attendance table with export placeholder.</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow hover:bg-primary-hover transition-colors inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Excel (coming soon)
        </button>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg bg-bg-secondary text-sm text-text-main">
            <Filter className="w-4 h-4" />
            All departments
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg text-sm text-text-main">
            <CalendarIcon className="w-4 h-4" />
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="border-none focus:outline-none"
            />
            <span className="text-text-muted">→</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border-none focus:outline-none"
            />
          </div>
          <div className="px-3 py-2 rounded-lg border border-border-light text-sm text-text-main bg-bg-secondary">In range</div>
        </div>

        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Employee code</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Employee name</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Department</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main bg-green-50">Late check-ins</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main bg-green-50">Late w/o request</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main bg-green-50">Early checkouts</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main bg-green-50">Completed checkouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-text-secondary">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading data...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-text-secondary">
                    No data
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row, idx) => (
                  <tr key={`${row.code}-${idx}`} className="hover:bg-bg-secondary">
                    <td className="px-3 py-2 text-text-main">{row.code}</td>
                    <td className="px-3 py-2 text-text-main font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-text-main">{row.dept}</td>
                    <td className="px-3 py-2 text-text-main">{row.late}</td>
                    <td className="px-3 py-2 text-text-main">{row.lateNoReason}</td>
                    <td className="px-3 py-2 text-text-main">{row.early}</td>
                    <td className="px-3 py-2 text-text-main">{row.checkout}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryDetailPage;
