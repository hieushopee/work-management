import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, PieChart, Loader2 } from "lucide-react";
import { fetchLogs } from "../../api/attendance";
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

const SummaryOverviewPage = () => {
  const now = useMemo(() => new Date(), []);
  const [start, setStart] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [end, setEnd] = useState(() => new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, late: 0, early: 0, missingCheckout: 0 });
  const [logs, setLogs] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchLogs(`${start}T00:00:00.000Z`, `${end}T23:59:59.999Z`);
      const logsData = Array.isArray(data) ? data : [];
      setLogs(logsData);
      const computed = logsData.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === "completed" || item.checkout?.time) acc.completed += 1;
          if ((item.lateMinutes || 0) > 0) acc.late += 1;
          if ((item.earlyMinutes || 0) > 0) acc.early += 1;
          if (!item.checkout?.time) acc.missingCheckout += 1;
          return acc;
        },
        { total: 0, completed: 0, late: 0, early: 0, missingCheckout: 0 }
      );
      setStats(computed);
    } catch (err) {
      console.error("Load summary error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [start, end]);

  // Group logs by day for bar chart
  const dailyData = useMemo(() => {
    if (!logs.length) return [];
    const dayMap = new Map();
    logs.forEach((log) => {
      const date = log.checkin?.time ? format(parseISO(log.checkin.time), 'yyyy-MM-dd') : null;
      if (!date) return;
      if (!dayMap.has(date)) {
        dayMap.set(date, { date, count: 0 });
      }
      dayMap.get(date).count += 1;
    });
    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'MM/dd'),
        count: dayMap.get(dateStr)?.count || 0
      };
    });
  }, [logs, start, end]);

  const maxDailyCount = useMemo(() => {
    return Math.max(...dailyData.map(d => d.count), 1);
  }, [dailyData]);

  // Calculate pie chart data
  const pieData = useMemo(() => {
    const total = stats.completed + stats.late + stats.early + stats.missingCheckout;
    if (total === 0) return [];
    return [
      { label: 'Completed', value: stats.completed, color: '#10B981' },
      { label: 'Late', value: stats.late, color: '#FF8C00' },
      { label: 'Early', value: stats.early, color: '#EC4899' },
      { label: 'Missing', value: stats.missingCheckout, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [stats]);

  const pieTotal = useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.value, 0);
  }, [pieData]);

  const cards = [
    { title: "Total check-ins", value: stats.total, color: "bg-primary" },
    { title: "Completed (in/out)", value: stats.completed, color: "bg-primary" },
    { title: "Late arrivals", value: stats.late, color: "bg-primary" },
    { title: "Early departures", value: stats.early, color: "bg-primary" },
    { title: "Missing checkout", value: stats.missingCheckout, color: "bg-primary" },
  ];

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Overview</h1>
          <p className="text-text-secondary">Attendance overview and quick metrics.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-main">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-text-muted">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-border-light bg-white p-5 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${c.color} text-white flex items-center justify-center text-lg font-bold`}> 
              {c.value}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-main">{c.title}</div>
              <div className="text-xs text-text-secondary">In the selected range</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-main">By day/week</h2>
              <p className="text-sm text-text-secondary">Check-ins distribution by day.</p>
            </div>
          </div>
          <div className="h-64 rounded-xl bg-bg-secondary border border-border-light p-4 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary">
                No data available
              </div>
            ) : (
              <div className="h-full flex items-end gap-0.5 pb-6">
                {dailyData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                      style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                      title={`${day.date}: ${day.count} check-ins`}
                    />
                    <span className="text-[10px] text-text-secondary transform -rotate-45 origin-top-left whitespace-nowrap" style={{ writingMode: 'vertical-rl', textAlign: 'left' }}>
                      {day.date.split('/')[1]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-main">Status ratio</h2>
              <p className="text-sm text-text-secondary">Completed / late / early breakdown.</p>
            </div>
          </div>
          <div className="h-64 rounded-xl bg-bg-secondary border border-border-light p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-secondary">
                No data available
              </div>
            ) : (
              <div className="h-full flex items-center justify-center gap-8">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="20"
                  />
                  {(() => {
                    const circumference = 2 * Math.PI * 80;
                    let currentOffset = 0;
                    return pieData.map((item, idx) => {
                      const percentage = (item.value / pieTotal) * 100;
                      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = currentOffset;
                      currentOffset -= (percentage / 100) * circumference;
                      return (
                        <circle
                          key={idx}
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="20"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="space-y-3">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                      <div className="text-sm">
                        <span className="font-semibold text-text-main">{item.label}:</span>
                        <span className="text-text-secondary ml-1">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryOverviewPage;
