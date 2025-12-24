import React, { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Filter, Loader2, X, ChevronDown, CircleUserRoundIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "../../libs/axios";
import { fetchAssignments, fetchShifts, saveAssignments } from "../../api/attendance";
import useDepartmentStore from "../../stores/useDepartmentStore";
// Holiday mapping (solar dates) without lunar conversion

const fmtHHMM = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
};

const formatLocalDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d)) return "";
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dateKey = (d) => formatLocalDate(d);

const rangeDates = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const days = [];
  if (Number.isNaN(s) || Number.isNaN(e) || s > e) return days;
  const cur = new Date(s);
  while (cur <= e && days.length < 60) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const toDateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

// Precomputed holidays (solar) for 2020-2030:
// - New Year 1/1; Reunification 30/4; Labor 1/5; National 2/9,3/9
    // - Tet: 5 days (3 days before + 1st + 2nd) according to the lunar new year calendar// - Giỗ Tổ (10/3 âm) theo bảng quy đổi
const holidayByYear = {
  2020: [
    "2020-01-01",
    "2020-01-22","2020-01-23","2020-01-24","2020-01-25","2020-01-26",
    "2020-04-02",
    "2020-04-30","2020-05-01",
    "2020-09-02","2020-09-03",
  ],
  2021: [
    "2021-01-01",
    "2021-02-09","2021-02-10","2021-02-11","2021-02-12","2021-02-13",
    "2021-04-21",
    "2021-04-30","2021-05-01",
    "2021-09-02","2021-09-03",
  ],
  2022: [
    "2022-01-01",
    "2022-01-29","2022-01-30","2022-01-31","2022-02-01","2022-02-02",
    "2022-04-10",
    "2022-04-30","2022-05-01",
    "2022-09-02","2022-09-03",
  ],
  2023: [
    "2023-01-01",
    "2023-01-19","2023-01-20","2023-01-21","2023-01-22","2023-01-23",
    "2023-04-29",
    "2023-04-30","2023-05-01",
    "2023-09-02","2023-09-03",
  ],
  2024: [
    "2024-01-01",
    "2024-02-07","2024-02-08","2024-02-09","2024-02-10","2024-02-11",
    "2024-04-18",
    "2024-04-30","2024-05-01",
    "2024-09-02","2024-09-03",
  ],
  2025: [
    "2025-01-01",
    "2025-01-26","2025-01-27","2025-01-28","2025-01-29","2025-01-30",
    "2025-04-07",
    "2025-04-30","2025-05-01",
    "2025-09-02","2025-09-03",
  ],
  2026: [
    "2026-01-01",
    "2026-02-14","2026-02-15","2026-02-16","2026-02-17","2026-02-18",
    "2026-04-26",
    "2026-04-30","2026-05-01",
    "2026-09-02","2026-09-03",
  ],
  2027: [
    "2027-01-01",
    "2027-02-03","2027-02-04","2027-02-05","2027-02-06","2027-02-07",
    "2027-04-15",
    "2027-04-30","2027-05-01",
    "2027-09-02","2027-09-03",
  ],
  2028: [
    "2028-01-01",
    "2028-01-23","2028-01-24","2028-01-25","2028-01-26","2028-01-27",
    "2028-04-03",
    "2028-04-30","2028-05-01",
    "2028-09-02","2028-09-03",
  ],
  2029: [
    "2029-01-01",
    "2029-02-10","2029-02-11","2029-02-12","2029-02-13","2029-02-14",
    "2029-04-22",
    "2029-04-30","2029-05-01",
    "2029-09-02","2029-09-03",
  ],
  2030: [
    "2030-01-01",
    "2030-01-30","2030-01-31","2030-02-01","2030-02-02","2030-02-03",
    "2030-04-11",
    "2030-04-30","2030-05-01",
    "2030-09-02","2030-09-03",
  ],
};

const ShiftPicker = ({ open, onClose, shifts, onSelect, date, employee }) => {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return shifts;
    return shifts.filter((s) => s.name.toLowerCase().includes(text));
  }, [filter, shifts]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Select shift</h2>
            <p className="text-sm text-text-secondary">
              {employee?.name || "Employee"} · {date ? new Date(date).toLocaleDateString("en-US") : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-auto">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search shift..."
            className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="space-y-2">
            {filtered.map((s) => (
              <button
                key={s._id || s.id}
                onClick={() => onSelect?.(s)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border-light hover:border-primary-300 hover:bg-primary-50 transition flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-text-main">{s.name}</div>
                  <div className="text-xs text-text-secondary">
                    {fmtHHMM(s.startMinutes)} - {fmtHHMM(s.endMinutes)} · {s.type === "hour" ? "Hourly shift" : "Day shift"}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${
                    s.type === "hour" ? "bg-purple-50 text-purple-700" : "bg-gray-200 text-text-main"
                  }`}
                >
                  {s.type === "hour" ? "Hourly" : "Daily"}
                </span>
              </button>
            ))}
              {filtered.length === 0 && (
              <div className="text-sm text-text-secondary text-center py-8">No matching shifts</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MemberPicker = ({ open, onClose, employees, selected = [], onApply, date, shift }) => {
  const [filter, setFilter] = useState("");
  const [localSelected, setLocalSelected] = useState(new Set(selected));

  useEffect(() => {
    setLocalSelected(new Set(selected));
  }, [selected]);

  const toggle = (id) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return employees;
    return employees.filter((e) => e.name?.toLowerCase().includes(text) || e.email?.toLowerCase().includes(text));
  }, [employees, filter]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h2 className="text-lg font-semibold text-text-main">Select employees</h2>
            <p className="text-sm text-text-secondary">
              {shift?.name || "Shift"} · {date ? new Date(date).toLocaleDateString("en-US") : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-auto">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search employee..."
            className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="space-y-2">
            {filtered.map((e) => {
              const id = e._id || e.id;
              return (
                <label
                  key={id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-light hover:border-primary-300 hover:bg-primary-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary rounded border-border-light"
                      checked={localSelected.has(id)}
                      onChange={() => toggle(id)}
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold text-text-main">{e.name || e.email}</span>
                      <span className="text-xs text-text-secondary">{e.email}</span>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">{e.employeeCode || e.code || ""}</span>
                </label>
              );
            })}
            {filtered.length === 0 && <div className="text-sm text-text-secondary text-center py-8">No employees</div>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-main hover:bg-bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply?.(Array.from(localSelected))}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

const ShiftAssignmentPage = () => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return formatLocalDate(d);
  }, [today]);
  const defaultEnd = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return formatLocalDate(d);
  }, [today]);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [assignmentsRaw, setAssignmentsRaw] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerState, setPickerState] = useState({ open: false, user: null, date: null });
  const [tab, setTab] = useState("employee"); // employee | shift
  const [assignMode, setAssignMode] = useState(false); // true when assigning
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState({});
  const selectedCount = useMemo(
    () => Object.values(selectedRows).filter(Boolean).length,
    [selectedRows]
  );
  const holidayDates = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start) || Number.isNaN(end)) return new Set();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const set = new Set();
    for (let y = startYear - 1; y <= endYear + 1; y += 1) {
      const list = holidayByYear[y];
      if (list) {
        list.forEach((d) => set.add(d));
      }
    }
    return set;
  }, [startDate, endDate]);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoForm, setAutoForm] = useState({
    start: defaultStart,
    end: defaultEnd,
    days: {},
    shiftPerDay: {},
  });
  const [memberPicker, setMemberPicker] = useState({ open: false, shift: null, date: null, selected: [] });
  const isValidObjectId = (val) => typeof val === "string" && /^[a-fA-F0-9]{24}$/.test(val);
  const normalizeId = (val) => {
    if (!val) return null;
    if (isValidObjectId(val)) return val;
    if (typeof val === "object") {
      if (val._id || val.id) {
        return normalizeId(val._id || val.id);
      }
      if (typeof val.toString === "function") {
        const str = val.toString();
        if (isValidObjectId(str)) return str;
      }
    }
    return null;
  };
  const getEmpId = (emp) => normalizeId(emp?._id || emp?.id);
  const getShiftId = (shift) => normalizeId(shift?._id || shift?.id);

  const rows = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const { departments, getAllDepartments } = useDepartmentStore();
  const [deptFilter, setDeptFilter] = useState("all");
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptOptions = useMemo(() => {
    const set = new Set();
    (departments || []).forEach((d) => {
      const name = (d?.name || "").trim();
      if (name) set.add(name);
    });
    rows.forEach((e) => {
      const dept = (e.department || e.departmentName || e.dept || "").trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
  }, [rows, departments]);
  const rowsByDept = useMemo(() => {
    if (deptFilter === "all") return rows;
    const target = deptFilter.trim().toLowerCase();
    return rows.filter((e) => (e.department || e.departmentName || e.dept || "").trim().toLowerCase() === target);
  }, [deptFilter, rows]);
  const shiftRows = useMemo(() => (Array.isArray(shifts) ? shifts : []), [shifts]);
  const dates = useMemo(() => rangeDates(startDate, endDate), [startDate, endDate]);
  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();
    const base = rowsByDept;
    if (!text) return base;
    return base.filter(
      (r) =>
        r.name?.toLowerCase().includes(text) ||
        r.email?.toLowerCase().includes(text) ||
        r.employeeCode?.toLowerCase().includes(text) ||
        r.code?.toLowerCase().includes(text)
    );
  }, [rowsByDept, search]);

  const assignmentList = useMemo(() => {
    const allowed = new Set(rowsByDept.map((u) => getEmpId(u)).filter(Boolean));
    const map = new Map();
    // backend assignments
    (assignmentsRaw || []).forEach((a) => {
      const userId = getEmpId(a.user) || getEmpId({ _id: a.user });
      const shiftId = getShiftId(a.shift);
      if (!userId || !shiftId) return;
      if (allowed.size && !allowed.has(userId)) return;
      const date = formatLocalDate(a.date);
      const user = rowsByDept.find((u) => getEmpId(u) === userId) || a.user || {};
      map.set(`${userId}-${date}`, { user, shift: a.shift, shiftId, date });
    });
    // local state (includes pending edits)
    Object.entries(assignments || {}).forEach(([key, shift]) => {
      const [userId, date] = key.split("-");
      const shiftId = getShiftId(shift);
      if (!userId || !shiftId || !date) return;
      if (allowed.size && !allowed.has(userId)) return;
      const user = rowsByDept.find((u) => getEmpId(u) === userId) || {};
      map.set(`${userId}-${date}`, { user, shift, shiftId, date });
    });
    return Array.from(map.values());
  }, [assignments, assignmentsRaw, rowsByDept, getEmpId, getShiftId]);

  const employeeTotal = (empId) =>
    dates.reduce((sum, d) => {
      const key = `${empId}-${dateKey(d)}`;
      return assignments[key] ? sum + 1 : sum;
    }, 0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes, assignRes] = await Promise.all([
        axios.get("/employees/all").then((r) => {
          const list = r.data?.users || r.data?.employees || r.data || [];
          return (Array.isArray(list) ? list : []).filter(
            (e) => (e.role || "").toLowerCase() !== "admin" && getEmpId(e)
          );
        }),
        fetchShifts(),
        fetchAssignments(startDate, endDate),
      ]);
      setEmployees(empRes);
      setShifts(Array.isArray(shiftRes) ? shiftRes : []);
      const map = {};
      (assignRes || []).forEach((a) => {
        const userKey = getEmpId(a.user) || getEmpId({ _id: a.user });
        if (!userKey) return;
        const key = `${userKey}-${formatLocalDate(a.date)}`;
        map[key] = a.shift;
      });
      setAssignments(map);
      setAssignmentsRaw(assignRes || []);
      setPending([]);
    } catch (err) {
      console.error("Load assignments error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  useEffect(() => {
    getAllDepartments?.();
  }, [getAllDepartments]);

  useEffect(() => {
    if (!deptDropdownOpen) return;
    const onClick = (e) => {
      // close when clicking outside
      if (!e.target.closest?.("#dept-dropdown-anchor")) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [deptDropdownOpen]);

  const handleSelectShift = (shift) => {
    const { user, date } = pickerState;
    if (!user || !date) return;
    const userId = getEmpId(user);
    const shiftId = getShiftId(shift);
    if (!userId || !shiftId) return;
    const key = `${userId}-${date}`;
    setAssignments((prev) => ({ ...prev, [key]: shift }));
    setPending((prev) => {
      const next = prev.filter((p) => !(p.user === userId && p.date === date));
      next.push({ user: userId, date, shift: shiftId });
      return next;
    });
    setPickerState({ open: false, user: null, date: null });
  };

  const handleSave = async () => {
    const merged = new Map();
    (pending || []).forEach((p) => {
      const user = isValidObjectId(p.user) ? p.user : null;
      const shift = isValidObjectId(p.shift) ? p.shift : null;
      const dateStr = formatLocalDate(p.date);
      const dateObj = new Date(dateStr);
      if (!user || !shift || Number.isNaN(dateObj.getTime())) return;
      merged.set(`${user}-${dateStr}`, {
        user,
        shift,
        date: dateObj.toISOString(),
      });
    });
    const valid = Array.from(merged.values());
    if (valid.length === 0) {
              alert("No shift assignments to save");      return;
    }
    try {
      await saveAssignments(valid, tab === "shift" ? "shift" : "employee");
      setPending([]);
      setAssignMode(false);
      setAssignMenuOpen(false);
      setSelectedRows({});
      setPickerState({ open: false, user: null, date: null });
      setAutoModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Save assignments error", err);
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || "Could not save shift assignments";
      alert(msg);
    }
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" id="dept-dropdown-anchor">
            <button
              type="button"
              onClick={() => setDeptDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium text-text-main shadow-sm hover:border-primary-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Filter className="w-4 h-4 text-text-secondary shrink-0" />
              <span className="truncate max-w-[140px] text-left">
                {deptFilter === "all" ? "All departments" : deptFilter}
              </span>
              <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
            </button>
            {deptDropdownOpen && (
              <div className="absolute z-20 mt-2 w-52 rounded-lg border border-border-light bg-white shadow-lg overflow-hidden">
                <ul className="max-h-64 overflow-y-auto text-sm text-text-main">
                  <li>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 hover:bg-primary-50 ${
                        deptFilter === "all" ? "bg-primary-50 font-semibold text-primary" : ""
                      }`}
                      onClick={() => {
                        setDeptFilter("all");
                        setDeptDropdownOpen(false);
                      }}
                    >
                      All departments
                    </button>
                  </li>
                  {deptOptions.map((dept) => (
                    <li key={dept}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-primary-50 ${
                          deptFilter === dept ? "bg-primary-50 font-semibold text-primary" : ""
                        }`}
                        onClick={() => {
                          setDeptFilter(dept);
                          setDeptDropdownOpen(false);
                        }}
                      >
                        {dept}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name..."
            className="w-56 rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 bg-white text-sm text-text-main">
              <CalendarIcon className="w-4 h-4" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  const start = new Date(v);
                  const end = new Date(endDate);
                  if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
                    setEndDate(v);
                  }
                }}
                className="bg-transparent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border-light px-3 py-2 bg-white text-sm text-text-main">
              <CalendarIcon className="w-4 h-4" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const start = new Date(startDate);
                  const end = new Date(v);
                  if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
                    setEndDate(startDate);
                  } else {
                    setEndDate(v);
                  }
                }}
                className="bg-transparent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1" />
          {!assignMode ? (
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <button
                  onClick={() => setAssignMenuOpen((v) => !v)}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow hover:bg-primary-hover inline-flex items-center gap-1"
                >
                  Assign shifts
                  <ChevronDown className="w-4 h-4" />
                </button>
                {assignMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border-light bg-white shadow-lg z-40">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                      onClick={() => {
                        setAssignMode(true);
                        setTab("employee");
                        setSelectedRows({});
                        setAssignMenuOpen(false);
                      }}
                    >
                      By employee
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                      onClick={() => {
                        setAssignMode(true);
                        setTab("shift");
                        setSelectedRows({});
                        setAssignMenuOpen(false);
                      }}
                    >
                      By shift
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/attendance/shifts")}
                className="px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Create shift
              </button>
              <button className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-sm font-semibold text-green-700">
                Import Excel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAssignMode(false);
                  setPending([]);
                  loadData();
                }}
                className="px-3 py-2 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          )}
        </div>

          <div className="flex items-center gap-3 text-sm text-text-secondary">
          <CalendarIcon className="w-4 h-4" />
          Date range: {startDate} → {endDate}
        </div>

        <div className="flex items-center gap-4 text-sm text-text-main flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Public holiday
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Weekly day off
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Paid day off
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Hourly shift
          </div>
        </div>

        <div className="rounded-xl border border-border-light overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Đang tải dữ liệu...
            </div>
          ) : (
            <div className="flex w-full">
              {/* Left table: employee or shift */}
              <div className="w-64 border-r-2 border-border-light">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-primary-50">
                      {assignMode && tab === "employee" && (
                        <th className="h-12 w-10 px-2 py-3 rounded-tl-xl">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary rounded border-border-light"
                            checked={
                              tab === "employee"
                                ? filteredRows.length > 0 &&
                                  filteredRows.every((emp) => selectedRows[getEmpId(emp)])
                                : shiftRows.length > 0 &&
                                  shiftRows.every((s) => selectedRows[getShiftId(s) || s.name])
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (tab === "employee") {
                                const next = {};
                                filteredRows.forEach((emp) => {
                                  const id = getEmpId(emp);
                                  if (id) next[id] = checked;
                                });
                                setSelectedRows(next);
                              } else {
                                const next = {};
                                shiftRows.forEach((s) => {
                                  const id = getShiftId(s) || s.name;
                                  next[id] = checked;
                                });
                                setSelectedRows(next);
                              }
                            }}
                          />
                        </th>
                      )}
                      <th className="h-12 px-3 py-3 text-left font-semibold text-text-main align-middle bg-primary-50 rounded-tl-xl">
                        {tab === "employee" ? "Employee name" : "Shift"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tab === "employee" &&
                      filteredRows.map((emp) => (
                        <tr key={getEmpId(emp)} className="hover:bg-bg-secondary">
                          {assignMode && tab === "employee" && (
                            <td className="h-14 w-10 px-2 py-3 align-middle">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-primary rounded border-border-light"
                                checked={!!selectedRows[getEmpId(emp)]}
                                onChange={(e) =>
                                  setSelectedRows((prev) => ({
                                    ...prev,
                                    [getEmpId(emp)]: e.target.checked,
                                  }))
                                }
                              />
                            </td>
                          )}
                          <td className="h-14 px-3 py-3 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col leading-tight">
                                <span className="text-text-main font-semibold">{emp.name || emp.email}</span>
                                <span className="text-xs text-text-secondary">{emp.email}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {tab === "shift" &&
                      shiftRows.map((shift) => {
                        const sid = getShiftId(shift) || shift.name;
                        return (
                          <tr key={sid} className="hover:bg-bg-secondary">
                            <td className="h-14 px-3 py-3 align-middle">
                              <div className="flex flex-col leading-tight">
                                <span className="text-text-main font-semibold">{shift.name}</span>
                                <span className="text-xs text-text-secondary">
                                  {fmtHHMM(shift.startMinutes)} - {fmtHHMM(shift.endMinutes)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {tab === "shift" && (
                      <tr className="bg-bg-secondary">
                        <td className="h-12 px-3 py-3 font-semibold text-text-main align-middle">Total</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right table: days */}
              <div className="flex-1 overflow-x-auto pb-4 rounded-tr-xl">
                <table className="min-w-[1000px] text-sm border-separate border-spacing-0">
                  <thead className="bg-primary-50 rounded-t-xl overflow-hidden">
                    <tr>
                      {[...dates.map((d) => {
                        const label = d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit" });
                        const key = dateKey(d);
                        return { key, label, minWidth: "min-w-[120px]", isHoliday: holidayDates.has(key) };
                      }), ...(tab === "employee" ? [{ key: "total-col", label: "Total", minWidth: "min-w-[110px]" }] : [])].map((col, idx, arr) => {
                        const isLast = idx === arr.length - 1;
                        const thClasses = `h-12 px-3 py-3 text-center font-semibold text-text-main ${col.minWidth} align-middle ${
                          isLast ? "rounded-tr-xl" : ""
                        }`;
                        return (
                          <th key={col.key} className={thClasses}>
                            <div className={`flex flex-col items-center ${col.isHoliday ? "text-red-600 font-semibold" : ""}`}>
                              <span>{col.label}</span>
                              {col.isHoliday && <span className="text-[11px]">Holiday</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tab === "employee" &&
                      filteredRows.map((emp) => {
                        const empId = getEmpId(emp);
                        if (!empId) return null;
                        return (
                          <tr key={empId} className="hover:bg-bg-secondary">
                            {dates.map((d) => {
                              const key = `${empId}-${dateKey(d)}`;
                              const shift = assignments[key];
                              const label = shift?.name || shift?.label;
                              const isHour = shift?.type === "hour";
                              // Nếu đang chọn nhiều nhân viên, chỉ mở picker khi ô được click
                              const onCellClick = () => {
                                // chỉ áp dụng cho theo nhân viên
                                if (tab !== "employee") return;
                                setPickerState({ open: true, user: emp, date: dateKey(d) });
                              };
                              const isHoliday = holidayDates.has(key);
                              return (
                                <td key={key} className="h-14 px-2 py-3 text-center align-middle">
                                  {assignMode ? (
                                    <button
                                      onClick={onCellClick}
                                      className={`inline-flex items-center justify-center ${
                                        label
                                          ? `min-w-[110px] rounded-lg border px-3 py-2 text-xs font-semibold ${
                                              isHour
                                                ? "border-purple-200 bg-purple-50 text-purple-700"
                                                : "border-border-light bg-bg-hover text-text-main"
                                            }`
                                          : "h-7 w-7 rounded-full border border-border-light bg-white text-text-secondary text-sm font-semibold hover:bg-bg-secondary"
                                      }`}
                                    >
                                      {label || "+"}
                                    </button>
                                  ) : label ? (
                                    <span
                                      className={`inline-flex min-w-[110px] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold ${
                                        isHour ? "bg-purple-50 text-purple-700" : "bg-bg-hover text-text-main"
                                      }`}
                                    >
                                      {label}
                                    </span>
                                  ) : isHoliday ? (
                                    <span className="inline-flex min-w-[110px] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                                      Holiday
                                    </span>
                                  ) : (
                                    <span className="text-text-muted text-xs">—</span>
                                  )}
                                </td>
                              );
                            })}
                            {tab === "employee" && (
                              <td className="h-14 px-3 py-3 text-center font-semibold text-text-main align-middle">
                                {employeeTotal(empId)}
                              </td>
                            )}
                          </tr>
                        );
                      })}

                    {tab === "shift" &&
                      (shifts || []).map((shift) => {
                        const shiftId = getShiftId(shift) || shift.name;
                        return (
                          <tr key={shiftId} className="hover:bg-bg-secondary">
                            {dates.map((d) => {
                              const dateStr = dateKey(d);
                              const members = assignmentList.filter((a) => a.date === dateStr && a.shiftId === shiftId);
                              const avatars = members.slice(0, 3);
                              const extra = members.length - avatars.length;
                              return (
                                <td key={`${dateStr}-${shiftId}`} className="h-14 px-2 py-3 text-center text-xs text-text-main align-middle">
                                  <div className="flex items-center justify-center flex-wrap gap-1">
                                    <div className="flex items-center justify-center -space-x-2">
                                      {avatars.map((m, idx) => {
                                        const avKey = `${shiftId}-${dateStr}-m-${idx}`;
                                        const title = m.user?.name || m.user?.email || "";
                                        return m.user?.avatar ? (
                                          <img
                                            key={avKey}
                                            src={m.user.avatar}
                                            alt={title}
                                            title={title}
                                            className="h-7 w-7 rounded-full border border-border-light object-cover"
                                          />
                                        ) : (
                                          <div
                                            key={avKey}
                                            title={title}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-light border border-border-light"
                                          >
                                            <CircleUserRoundIcon className="h-6 w-6 text-primary" />
                                          </div>
                                        );
                                      })}
                                      {extra > 0 && (
                                        <span className="inline-flex h-7 px-2 items-center justify-center rounded-full bg-gray-700 text-white text-[10px] font-semibold">
                                          +{extra}
                                        </span>
                                      )}
                                    </div>
                                    {assignMode ? (
                                      <button
                                        onClick={() =>
                                          setMemberPicker({
                                            open: true,
                                            shift,
                                            date: dateStr,
                                            selected: members.map((m) => getEmpId(m.user)).filter(Boolean),
                                          })
                                        }
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-light bg-white text-text-secondary hover:bg-bg-secondary text-sm font-semibold"
                                      >
                                        +
                                      </button>
                                    ) : members.length === 0 ? (
                                      <span className="text-text-muted">—</span>
                                    ) : null}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    {tab === "shift" && (
                      <tr className="bg-bg-secondary font-semibold text-text-main">
                        {dates.map((d) => {
                          const key = dateKey(d);
                          const totalForDate = assignmentList.filter((a) => a.date === key).length;
                          return (
                            <td key={`total-${key}`} className="h-12 px-3 py-3 text-center align-middle">
                              {totalForDate}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {assignMode && tab === "employee" && selectedCount > 0 && (
          <div className="flex items-center justify-between text-sm text-text-main px-2">
            <span>{selectedCount} employees selected</span>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              onClick={() => setAutoModalOpen(true)}
            >
              Auto-assign shifts
            </button>
          </div>
        )}

      </div>

      <ShiftPicker
        open={pickerState.open}
        onClose={() => setPickerState({ open: false, user: null, date: null })}
        shifts={shifts}
        onSelect={handleSelectShift}
        date={pickerState.date}
        employee={pickerState.user}
      />
      <MemberPicker
        open={memberPicker.open}
        onClose={() => setMemberPicker({ open: false, shift: null, date: null, selected: [] })}
        employees={rowsByDept}
        selected={memberPicker.selected}
        date={memberPicker.date}
        shift={memberPicker.shift}
        onApply={(selectedIds) => {
          if (!memberPicker.shift || !memberPicker.date) return setMemberPicker({ open: false, shift: null, date: null, selected: [] });
          const shiftId = getShiftId(memberPicker.shift);
          if (!isValidObjectId(shiftId)) {
            setMemberPicker({ open: false, shift: null, date: null, selected: [] });
            return;
          }
          const shiftObj = shifts.find((s) => getShiftId(s) === shiftId) || memberPicker.shift;
          const updates = [];
          selectedIds.forEach((empId) => {
            if (!isValidObjectId(empId)) return;
            const key = `${empId}-${memberPicker.date}`;
            updates.push({ user: empId, date: memberPicker.date, shift: shiftId });
            setAssignments((prev) => ({ ...prev, [key]: shiftObj }));
          });
          if (updates.length > 0) {
            setPending((prev) => [...prev, ...updates]);
          }
          setMemberPicker({ open: false, shift: null, date: null, selected: [] });
        }}
      />

      {autoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <div>
              <h2 className="text-lg font-semibold text-text-main">Assign shifts by employee</h2>
              <p className="text-sm text-text-secondary">Employees selected: {selectedCount}</p>
                <div className="flex -space-x-2 mt-1">
                  {filteredRows
                    .filter((emp) => selectedRows[getEmpId(emp)])
                    .slice(0, 5)
                    .map((emp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary text-xs font-semibold border border-white"
                      >
                        {emp.name?.[0] || emp.email?.[0] || "👤"}
                      </span>
                    ))}
                  {selectedCount > 5 && (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-hover text-text-secondary text-xs font-semibold border border-white">
                      +{selectedCount - 5}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setAutoModalOpen(false)} className="text-text-muted hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-auto">
              <div>
                <div className="text-sm font-semibold text-text-main mb-2">Assignment Type</div>
                <div className="text-sm text-text-main">By Week</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-text-main">Select Days of Week</div>
                {[
                  { key: 1, label: "Monday" },
                  { key: 2, label: "Tuesday" },
                  { key: 3, label: "Wednesday" },
                  { key: 4, label: "Thursday" },
                  { key: 5, label: "Friday" },
                  { key: 6, label: "Saturday" },
                  { key: 0, label: "Sunday" },
                ].map((d) => {
                  const checked = autoForm.days[d.key];
                  const shiftId = autoForm.shiftPerDay[d.key];
                  const shiftObj = shifts.find((s) => (s._id || s.id) === shiftId);
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary rounded border-border-light"
                        checked={!!checked}
                        onChange={(e) =>
                          setAutoForm((prev) => ({
                            ...prev,
                            days: { ...prev.days, [d.key]: e.target.checked },
                          }))
                        }
                      />
                      <span className="w-20 text-sm text-text-main">{d.label}</span>
                      {checked && (
                        <select
                          value={shiftId || ""}
                          onChange={(e) =>
                            setAutoForm((prev) => ({
                              ...prev,
                              shiftPerDay: { ...prev.shiftPerDay, [d.key]: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                        >
                          <option value="">Select shift</option>
                          {shifts.map((s) => (
                            <option key={s._id || s.id} value={s._id || s.id}>
                              {s.name} · {fmtHHMM(s.startMinutes)} - {fmtHHMM(s.endMinutes)}
                            </option>
                          ))}
                        </select>
                      )}
                      {checked && shiftObj && (
                        <span className="text-xs text-text-secondary">
                          {shiftObj.type === "hour" ? "Hourly shift" : "Day shift"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-main">Start Date</label>
                  <input
                    type="date"
                    value={autoForm.start}
                    onChange={(e) => setAutoForm((p) => ({ ...p, start: e.target.value }))}
                    className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-main">End Date</label>
                  <input
                    type="date"
                    value={autoForm.end}
                    onChange={(e) => setAutoForm((p) => ({ ...p, end: e.target.value }))}
                    className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button
                onClick={() => setAutoModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const activeDays = Object.entries(autoForm.days)
                    .filter(([, v]) => v)
                    .map(([k]) => Number(k));
                  if (activeDays.length === 0) return setAutoModalOpen(false);
                  const start = autoForm.start || startDate;
                  const end = autoForm.end || endDate;
                  const datesRange = rangeDates(start, end);
                  const selectedEmps = filteredRows.filter((emp) => selectedRows[getEmpId(emp)]);
                  const updates = [];
                  datesRange.forEach((d) => {
                    const day = d.getDay();
                    if (!activeDays.includes(day)) return;
                    const shiftId = autoForm.shiftPerDay[day];
                    if (!isValidObjectId(shiftId)) return;
                    selectedEmps.forEach((emp) => {
                      const dateStr = dateKey(d);
                      const empId = getEmpId(emp);
                      const key = `${empId}-${dateStr}`;
                      const shiftObj = shifts.find((s) => (s._id || s.id) === shiftId);
                      if (shiftObj && empId) {
                        updates.push({ user: empId, date: dateStr, shift: shiftId });
                        setAssignments((prev) => ({ ...prev, [key]: shiftObj }));
                      }
                    });
                  });
                  if (updates.length > 0) {
                    setPending((prev) => [...prev, ...updates]);
                  }
                  setAutoModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftAssignmentPage;
