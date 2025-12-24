import React, { useEffect, useMemo, useState } from "react";
import { History, Search, Filter, AlertCircle, Send, X } from "lucide-react";
import { fetchLogs, sendLogNotification, fetchMyShifts, fetchDeviceRequests } from "../../api/attendance";
import useUserStore from "../../stores/useUserStore";
import useEmployeeStore from "../../stores/useEmployeeStore";
import { toast } from "react-hot-toast";

const HistoryPage = () => {
  const { user } = useUserStore();
  const role = (user?.role || "staff").toLowerCase();
  const myId = String(user?._id || user?.id || "");
  const { employees, getAllEmployees } = useEmployeeStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewScope, setViewScope] = useState(role === "staff" ? "self" : "self"); // self | members
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const localDateStr = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
  };
  const toLocalDateKey = (val) => {
    if (!val) return "";
    const d = val instanceof Date ? new Date(val) : new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  };

  const normalizeId = (s) => String(s || "").trim().toLowerCase();
  // Default range: first day -> last day of current month (local time)
  const [start, setStart] = useState(() => {
    const now = new Date();
    const tz = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - tz);
    const first = new Date(local.getFullYear(), local.getMonth(), 1);
    return toLocalDateKey(first);
  });
  const [end, setEnd] = useState(() => {
    const now = new Date();
    const tz = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - tz);
    const last = new Date(local.getFullYear(), local.getMonth() + 1, 0);
    return toLocalDateKey(last);
  });
  const [notificationModal, setNotificationModal] = useState({ open: false, log: null, note: "" });
  const [detailModal, setDetailModal] = useState({ open: false, log: null });
  const [deviceMap, setDeviceMap] = useState({});
  const [approvedDeviceIds, setApprovedDeviceIds] = useState(new Set());

  // Load employees for manager/admin to pick team members
  useEffect(() => {
    if ((role === "manager" || role === "admin") && !employees) {
      getAllEmployees?.();
    }
  }, [role, employees, getAllEmployees]);

  const memberOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    if (role === "manager" && user?.department) {
      return list.filter(
        (e) => (e.department || e.departmentName || e.dept || "").trim() === (user.department || "").trim()
      );
    }
    return list;
  }, [employees, role, user?.department]);

  const memberIdList = useMemo(
    () =>
      (memberOptions || [])
        .map((m) => String(m._id || m.id || m.userId || ""))
        .filter(Boolean),
    [memberOptions]
  );

  const memberLookup = useMemo(() => {
    const map = {};
    (memberOptions || []).forEach((m) => {
      const id = String(m._id || m.id || m.userId || "");
      if (id) map[id] = m;
    });
    return map;
  }, [memberOptions]);

  const getLogUserId = (log) => String(log?.user?._id || log?.user?.id || log?.user || log?.userId || "");
  const getAssignmentUserId = (item) => String(item?.user?._id || item?.user?.id || item?.user || "");

  const buildAssignmentMap = (items) => {
    const map = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const uid = getAssignmentUserId(item);
      const dateStr = toLocalDateKey(item.date);
      if (!uid || !dateStr) return;
      if (!map[uid]) map[uid] = {};
      map[uid][dateStr] = item.shift || item;
    });
    return map;
  };

  const load = async () => {
    setLoading(true);
    try {
      const startIso = `${start}T00:00:00`;
      const endIso = `${end}T23:59:59.999`;
      const targetUserIds =
        role === "staff" || viewScope === "self"
          ? [myId]
          : selectedUserIds.length > 0
          ? selectedUserIds
          : role === "manager"
          ? memberIdList
          : [];
      const paramsUserIds = targetUserIds.filter(Boolean);

      const [data, assignments] = await Promise.all([
        fetchLogs(startIso, endIso, viewScope === "self" ? myId : undefined, {
          userIds: paramsUserIds.length ? paramsUserIds : undefined,
        }),
        fetchMyShifts(start, end, { userIds: paramsUserIds.length ? paramsUserIds : undefined }),
      ]);

      const assignmentMap = buildAssignmentMap(assignments);

      const normalizedLogs = (Array.isArray(data) ? data : []).map((log) => {
        const logUserId = getLogUserId(log);
        const assignmentByDate = assignmentMap[logUserId] || {};
          const checkinTime = log.checkin?.time ? new Date(log.checkin.time) : null;
          const dateStr = checkinTime ? toLocalDateKey(checkinTime) : toLocalDateKey(log.date) || "";
          const assignmentShift = dateStr ? assignmentByDate[dateStr] : null;

          // Bổ sung fallback tính đi muộn / về sớm nếu backend chưa gửi, dựa trên shift
          let late = log.lateMinutes || 0;
          let early = log.earlyMinutes || 0;
          if (assignmentShift && (late === 0 || early === 0)) {
            const startM = assignmentShift.startMinutes;
            const endM = assignmentShift.endMinutes;
            if (typeof startM === "number" && typeof endM === "number") {
              const toMin = (d) => {
                if (!d) return null;
                const dd = new Date(d);
                return dd.getHours() * 60 + dd.getMinutes();
              };
              const ci = toMin(log.checkin?.time);
              const co = toMin(log.checkout?.time);
              const endEff = endM <= startM ? endM + 24 * 60 : endM;
              const norm = (m) => {
                if (m == null) return null;
                if (endEff > 24 * 60 && m < startM) return m + 24 * 60;
                return m;
              };
              const ciEff = norm(ci);
              const coEff = norm(co);
              if (ciEff != null) late = Math.max(late, ciEff - startM);
              if (coEff != null) {
                early = Math.max(early, endEff - coEff);
              }
            }
          }

          return {
            ...log,
          user: log.user || memberLookup[logUserId] || log.user,
            date: dateStr,
            shiftName: log.shift?.name || log.shiftName || assignmentShift?.name || null,
            shift: log.shift || assignmentShift || null,
            lateMinutes: late,
            earlyMinutes: early,
          };
        });

      // Bổ sung ngày có phân ca nhưng chưa có log cho từng người
      const assignmentRows = [];
      Object.entries(assignmentMap).forEach(([uid, byDate]) => {
        const datesWithLogs = new Set(normalizedLogs.filter((l) => getLogUserId(l) === uid).map((l) => l.date));
        Object.entries(byDate).forEach(([dateStr, shift]) => {
          if (datesWithLogs.has(dateStr)) return;
          assignmentRows.push({
            user: memberLookup[uid],
            userId: uid,
          date: dateStr,
          shiftName: shift?.name || null,
          shift,
          status: "pending",
          checkin: {},
          checkout: {},
          lateMinutes: 0,
          earlyMinutes: 0,
          });
        });
      });

      const merged = [...normalizedLogs, ...assignmentRows].sort((a, b) => {
        const ua = getLogUserId(a);
        const ub = getLogUserId(b);
        if (ua === ub) return (a.date || "").localeCompare(b.date || "");
        return ua.localeCompare(ub);
      });

      setLogs(merged);
    } catch (err) {
      console.error("Load history error", err);
    } finally {
      setLoading(false);
    }
  };

  // Load thiết bị được duyệt để hiển thị tên + tính hợp lệ
  useEffect(() => {
    fetchDeviceRequests()
      .then((list) => {
        const uid = String(user?._id || user?.id || "");
        const mine = (list || []).filter((r) => {
          const ru = String(r.user?._id || r.requesterId || r.requester || "");
          return uid && ru && ru === uid && String(r.status || "").toLowerCase() === "approved";
        });
        const names = {};
        const ids = new Set();
        mine.forEach((r) => {
          const rawId = r.newDevice?.deviceId || r.newDeviceId || r.deviceId || "";
          const normId = normalizeId(rawId);
          const name = r.newDevice?.deviceName || r.deviceName || rawId;
          if (normId) {
            names[normId] = { display: rawId, name };
            ids.add(normId);
          }
        });
        setDeviceMap(names);
        setApprovedDeviceIds(ids);
      })
      .catch(() => {});
  }, [user?._id, user?.id]);

  useEffect(() => {
    if (user) load();
  }, [start, end, user, viewScope, selectedUserIds]);

  const showUserColumn = role !== "staff" && viewScope === "members";
  const columnCount = showUserColumn ? 9 : 8;

  const filtered = logs.filter((log) => {
    const text = search.trim().toLowerCase();
    if (!text) return true;
    const date = log.date || "";
    const status = log.status || "";
    const shiftName = log.shiftName || log.shift?.name || "";
    const userName = log.user?.name || log.user?.email || "";
    return (
      date.toLowerCase().includes(text) ||
      status.toLowerCase().includes(text) ||
      shiftName.toLowerCase().includes(text) ||
      userName.toLowerCase().includes(text)
    );
  });

  const handleSendNotification = async () => {
    if (!notificationModal.log || !notificationModal.note.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    try {
      await sendLogNotification(notificationModal.log._id || notificationModal.log.id, notificationModal.note);
      toast.success("Notification sent successfully");
      setNotificationModal({ open: false, log: null, note: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const formatDateTime = (isoString) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(
      d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const timeWithDelta = (isoString, deltaMinutes, label) => {
    const base = formatDateTime(isoString);
    if (deltaMinutes > 0) {
      return `${base} (${label} ${deltaMinutes} min)`;
    }
    return base;
  };

  const getDeviceInfo = (log, key = "checkin") => {
    const deviceId = log?.[key]?.deviceId || log?.checkin?.deviceId || "";
    const norm = normalizeId(deviceId);
    const found = deviceMap[norm];
    const name = found?.name || found?.display || deviceId || "—";
    const hasWhitelist = approvedDeviceIds && approvedDeviceIds.size > 0;
    // Nếu backend đã cho checkin/checkout, coi như hợp lệ khi không có whitelist; chỉ đánh dấu không hợp lệ khi whitelist tồn tại và không khớp
    const valid = deviceId
      ? hasWhitelist
        ? approvedDeviceIds.has(norm)
        : true
      : false;
    return { deviceId, name, valid };
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Attendance History</h1>
          <p className="text-text-secondary">
            {role === "manager"
              ? "View your history or the history of your department members."
              : role === "admin"
              ? "View attendance history of employees."
              : "View your check-in/checkout history."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-main flex-wrap">
          {(role === "manager" || role === "admin") && (
            <div className="flex items-center gap-2">
              <label className="font-medium">View for</label>
              <select
                value={viewScope}
                onChange={(e) => {
                  const next = e.target.value;
                  setViewScope(next);
                  if (next === "self") setSelectedUserIds([]);
                }}
                className="px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="self">Me</option>
                <option value="members">Members</option>
              </select>
              {viewScope === "members" && (
                <select
                  multiple
                  value={selectedUserIds}
                  onChange={(e) =>
                    setSelectedUserIds(Array.from(e.target.selectedOptions).map((o) => o.value).filter(Boolean))
                  }
                  className="min-w-[200px] px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {memberOptions.length === 0 && <option>No members yet</option>}
                  {memberOptions.map((m) => {
                    const id = String(m._id || m.id || m.userId || "");
                    return (
                      <option key={id} value={id}>
                        {m.name || m.email || "No name"}
                      </option>
                    );
                  })}
                </select>
              )}
        </div>
          )}
          <div className="flex items-center gap-2">
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
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by date, status, shift..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                {showUserColumn && <th className="px-3 py-2 text-left font-semibold text-text-main">Employee</th>}
                <th className="px-3 py-2 text-left font-semibold text-text-main">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Shift</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Check-in</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Late</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Check-out</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Early Leave</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Status</th>
                <th className="px-3 py-2 text-center font-semibold text-text-main">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={columnCount} className="px-3 py-8 text-center text-text-secondary">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="px-3 py-8 text-center text-text-secondary">
                    No data
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((log, idx) => (
                  <tr key={log._id || log.id || idx} className="hover:bg-bg-secondary">
                    {(() => {
                      const isOwnLog = getLogUserId(log) === myId;
                      return (
                        <>
                          {showUserColumn && (
                            <td className="px-3 py-2 text-text-main">{log.user?.name || log.user?.email || "—"}</td>
                          )}
                    <td className="px-3 py-2 text-text-main">{log.date || "--"}</td>
                    <td className="px-3 py-2 text-text-main">{log.shift?.name || log.shiftName || "--"}</td>
                    <td className="px-3 py-2 text-text-main">{formatTime(log.checkin?.time)}</td>
                    <td className="px-3 py-2 text-text-main">{log.lateMinutes > 0 ? `${log.lateMinutes}p` : "0p"}</td>
                    <td className="px-3 py-2 text-text-main">{formatTime(log.checkout?.time)}</td>
                    <td className="px-3 py-2 text-text-main">{log.earlyMinutes > 0 ? `${log.earlyMinutes}p` : "0p"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          log.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : log.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-bg-hover text-text-main"
                        }`}
                      >
                        {log.status === "completed" ? "Completed" : log.status === "pending" ? "Incomplete" : log.status || "--"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDetailModal({ open: true, log })}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-border-light text-text-main text-xs font-semibold hover:bg-bg-secondary"
                          title="View details"
                        >
                          <History className="w-3 h-3" />
                          Details
                        </button>
                              {isOwnLog && (
                        <button
                          onClick={() => setNotificationModal({ open: true, log, note: "" })}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary-50 text-primary text-xs font-semibold hover:bg-primary-light"
                          title="Send report"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Report
                        </button>
                              )}
                      </div>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              {!loading && filtered.length > 0 && (
                <tr className="bg-bg-secondary font-semibold">
                  <td className="px-3 py-2 text-text-main" colSpan={showUserColumn ? 2 : 1}>
                    Total Entries
                  </td>
                  <td className="px-3 py-2 text-text-main">{filtered.length}</td>
                  <td className="px-3 py-2 text-text-main" colSpan={showUserColumn ? 6 : 6}>
                    Completed: {filtered.filter((l) => l.status === "completed").length} / {filtered.length}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Modal */}
      {notificationModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-main">Send Notification</h3>
                <p className="text-sm text-text-secondary">Provide a reason for incomplete timekeeping</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Reason *</label>
              <textarea
                value={notificationModal.note}
                onChange={(e) => setNotificationModal((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Enter reason..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotificationModal({ open: false, log: null, note: "" })}
                className="flex-1 px-4 py-2 rounded-lg border border-border-light text-text-main font-medium hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (desktop style) */}
      {detailModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Attendance Details</p>
                <h3 className="text-xl font-semibold text-text-main">{detailModal.log?.date || "--"}</h3>
                <p className="text-sm text-text-secondary">
                  Shift: {detailModal.log?.shift?.name || detailModal.log?.shiftName || "—"}
                </p>
              </div>
              <button
                onClick={() => setDetailModal({ open: false, log: null })}
                className="p-2 rounded-lg border border-border-light text-sm font-medium text-text-secondary hover:bg-bg-secondary"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border-light rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Check-in
                  {detailModal.log?.lateMinutes > 0 && (
                    <span className="text-xs text-red-600 font-semibold">
                      (Late {detailModal.log?.lateMinutes} minutes)
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-main">
                  Time: {timeWithDelta(detailModal.log?.checkin?.time, detailModal.log?.lateMinutes || 0, "Late")}
                </p>
                <p className="text-sm text-text-main">
                  Địa điểm: {detailModal.log?.location?.name || "—"}
                </p>
                <p className="text-sm text-text-main">
                  {(() => {
                    const info = getDeviceInfo(detailModal.log, "checkin");
                    return (
                      <>
                        Thiết bị: {info.name}{" "}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ml-1 ${
                            info.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {info.valid ? "Valid" : "Invalid"}
                        </span>
                      </>
                    );
                  })()}
                </p>
                {Array.isArray(detailModal.log?.checkin?.photos) && detailModal.log.checkin.photos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-text-secondary font-medium">Attendance Images:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {detailModal.log.checkin.photos.map((p, i) => (
                        <a
                          key={i}
                          href={p}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-lg border border-border-light"
                        >
                          <img src={p} alt="checkin" className="w-full h-48 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-border-light rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Check-out
                  {detailModal.log?.earlyMinutes > 0 && (
                    <span className="text-xs text-orange-600 font-semibold">
                      (Sớm {detailModal.log?.earlyMinutes} phút)
                    </span>
                  )}
                  {detailModal.log?.overtimeMinutes > 0 && (
                    <span className="text-xs text-emerald-600 font-semibold">
                      (Overtime {detailModal.log?.overtimeMinutes} minutes)
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-main">
                  Thời gian:{" "}
                  {timeWithDelta(detailModal.log?.checkout?.time, detailModal.log?.earlyMinutes || 0, "Early")}
                  {detailModal.log?.overtimeMinutes > 0
                    ? ` (Overtime ${detailModal.log?.overtimeMinutes} min)`
                    : ""}
                </p>
                <p className="text-sm text-text-main">
                  Địa điểm: {detailModal.log?.location?.name || "—"}
                </p>
                <p className="text-sm text-text-main">
                  {(() => {
                    const info = getDeviceInfo(detailModal.log, "checkout");
                    return (
                      <>
                        Thiết bị: {info.name}{" "}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ml-1 ${
                            info.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {info.valid ? "Valid" : "Invalid"}
                        </span>
                      </>
                    );
                  })()}
                </p>
                {Array.isArray(detailModal.log?.checkout?.photos) && detailModal.log.checkout.photos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-text-secondary font-medium">Attendance Images:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {detailModal.log.checkout.photos.map((p, i) => (
                        <a
                          key={i}
                          href={p}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-lg border border-border-light"
                        >
                          <img src={p} alt="checkout" className="w-full h-48 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-text-secondary">Status</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  detailModal.log?.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : detailModal.log?.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-bg-hover text-text-main"
                }`}
              >
                {detailModal.log?.status === "completed"
                  ? "Completed"
                  : detailModal.log?.status === "pending"
                  ? "Incomplete"
                  : detailModal.log?.status || "--"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;





