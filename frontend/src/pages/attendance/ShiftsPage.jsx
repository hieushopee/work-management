import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Download, Filter } from "lucide-react";
import {
  fetchShifts,
  createShift as apiCreateShift,
  deleteShift as apiDeleteShift,
} from "../../api/attendance";
import useDepartmentStore from "../../stores/useDepartmentStore";

const fmt = (minutes) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
};

const generateTimes = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};

const TimeSelect = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || "");
  const options = useMemo(() => generateTimes(), []);
  const wrapperRef = useRef(null);

  const filtered = options.filter((opt) => {
    if (!input) return true;
    return opt.startsWith(input.padStart(2, "0"));
  });

  const selectValue = (val) => {
    onChange?.(val);
    setInput(val);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="text-sm font-medium text-text-main">{label}</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onClick={() => setOpen((prev) => !prev)}
        placeholder="HH:MM"
        className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-border-light bg-white shadow-lg">
          {filtered.map((opt) => (
            <button
              type="button"
              key={opt}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectValue(opt)}
            >
              {opt}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-secondary">Not found</div>
          )}
        </div>
      )}
    </div>
  );
};

const emptyForm = {
  name: "",
  dept: "",
  start: "",
  end: "",
  type: "day", // "day" | "hour"
};

const ShiftModal = ({ open, onClose, onSave }) => {
  const [form, setForm] = useState(emptyForm);
  const { departments, getAllDepartments } = useDepartmentStore();

  useEffect(() => {
    if (open) {
      getAllDepartments?.();
      setForm(emptyForm);
    }
  }, [open, getAllDepartments]);

  if (!open) return null;

  const isHourType = form.type === "hour";

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-text-main">Create shift</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Shift name *</label>
            <input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter shift name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Department *</label>
            <select
              value={form.dept}
              onChange={(e) => handleChange("dept", e.target.value)}
              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All departments</option>
              {(departments || []).map((d) => (
                <option key={d._id || d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeSelect
              label="Start time *"
              value={form.start}
              onChange={(val) => handleChange("start", val)}
            />
            <TimeSelect
              label="End time *"
              value={form.end}
              onChange={(val) => handleChange("end", val)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">Shift type *</label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="day">Day shift</option>
                <option value="hour">Hourly shift (part-time)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">Point *</label>
              <input
                value={isHourType ? "Hourly: 1h = 1 point" : "Daily: 1 day = 1 point"}
                readOnly
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm bg-bg-secondary text-text-main"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border-light px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-main hover:bg-bg-secondary">Cancel</button>
          <button
            onClick={() => onSave?.(form)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow hover:bg-primary-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const ShiftsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [shifts, setShifts] = useState([]);

  const loadShifts = async () => {
    try {
      const data = await fetchShifts();
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load shifts error", err);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleCreateShift = async (form) => {
    try {
      await apiCreateShift({
        name: form.name,
        type: form.type,
        start: form.start,
        end: form.end,
        departments: form.dept ? [form.dept] : [],
      });
      setModalOpen(false);
      loadShifts();
    } catch (err) {
      console.error("Create shift error", err);
      alert("Cannot create shift");
    }
  };

  const renderTypeBadge = (type) => {
    if (type === "hour") {
      return (
        <span className="inline-flex items-center rounded-lg bg-purple-50 text-purple-700 px-3 py-1 text-xs font-semibold">
          Hourly shift
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-lg bg-gray-200 text-text-main px-3 py-1 text-xs font-semibold">
        Day shift
      </span>
    );
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Shifts</h1>
          <p className="text-text-secondary">Create and manage day/hour shifts. 1 day = 1 point, 1 hour = 1 point (hourly).</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-border-light bg-white text-sm font-medium text-text-main hover:bg-bg-secondary inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Import Excel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow inline-flex items-center gap-2 hover:bg-primary-hover"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add new
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg bg-bg-secondary text-sm text-text-main">
            <Filter className="w-4 h-4" />
            All departments
          </div>
          <input
            type="text"
            placeholder="Search shift name..."
            className="px-3 py-2 rounded-lg border border-border-light text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Shift name</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Department</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Time</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Point</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Created at</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.map((row) => (
                <tr key={row._id || row.id || row.name} className="hover:bg-bg-secondary">
                  <td className="px-3 py-3 text-text-main font-semibold">{row.name}</td>
                  <td className="px-3 py-3 text-text-main">{Array.isArray(row.departments) ? row.departments.join(", ") : ""}</td>
                  <td className="px-3 py-3">{renderTypeBadge(row.type)}</td>
                  <td className="px-3 py-3 text-text-main">{fmt(row.startMinutes)} - {fmt(row.endMinutes)}</td>
                  <td className="px-3 py-3 text-text-main">{row.type === "hour" ? "Hourly: 1h = 1 point" : "Daily: 1 day = 1 point"}</td>
                  <td className="px-3 py-3 text-text-main">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-US") : ""}</td>
                  <td className="px-3 py-3 text-text-main">
                    <button
                      className="text-red-500 hover:text-red-600 text-sm"
                      onClick={() => {
                        if (window.confirm("Delete this shift?")) {
                          apiDeleteShift(row._id || row.id)
                            .then(loadShifts)
                            .catch(() => alert("Cannot delete shift"));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ShiftModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreateShift} />
    </div>
  );
};

export default ShiftsPage;
