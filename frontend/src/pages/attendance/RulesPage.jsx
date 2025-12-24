import React, { useEffect, useState } from "react";
import { Settings2, Save } from "lucide-react";
import { fetchRules, updateRules } from "../../api/attendance";

const RulesPage = () => {
  const [form, setForm] = useState({
    delayMinutes: 10,
    leaveEarlyMinutes: 10,
    allowOutsideLocation: false,
    allowOutsideDevice: false,
    holidayOvertimeRate: 3,
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRules();
      if (data) {
        setForm({
          delayMinutes: data.delayToleranceMinutes ?? data.delayMinutes ?? 10,
          leaveEarlyMinutes: data.leaveEarlyToleranceMinutes ?? data.leaveEarlyMinutes ?? 10,
          allowOutsideLocation: Boolean(data.allowOutsideLocation),
          allowOutsideDevice: Boolean(data.allowOutsideDevice),
          holidayOvertimeRate: data.holidayOvertimeRate ?? 3,
        });
      }
    } catch (err) {
      console.error("Load rules error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      await updateRules(form);
      alert("Attendance rules saved");
    } catch (err) {
      console.error("Save rules error", err);
      alert("Cannot save rules");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Attendance Rules</h1>
          <p className="text-text-secondary">
            Configure late/early thresholds and allow check-in outside assigned locations/devices.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow inline-flex items-center gap-2 hover:bg-primary-hover"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>
      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-main">Rules configuration</h2>
            <p className="text-sm text-text-secondary">Set thresholds and holiday overtime rate.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Allowed late minutes</label>
            <input
              type="number"
              value={form.delayMinutes}
              onChange={(e) => setForm((p) => ({ ...p, delayMinutes: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              min={0}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Holiday overtime rate (x)</label>
            <input
              type="number"
              step="0.1"
              min={1}
              value={form.holidayOvertimeRate}
              onChange={(e) => setForm((p) => ({ ...p, holidayOvertimeRate: Number(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Allowed early minutes</label>
            <input
              type="number"
              value={form.leaveEarlyMinutes}
              onChange={(e) => setForm((p) => ({ ...p, leaveEarlyMinutes: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              min={0}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary rounded border-border-light"
              checked={form.allowOutsideLocation}
              onChange={(e) => setForm((p) => ({ ...p, allowOutsideLocation: e.target.checked }))}
            />
            Allow check-in outside assigned locations
          </label>
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary rounded border-border-light"
              checked={form.allowOutsideDevice}
              onChange={(e) => setForm((p) => ({ ...p, allowOutsideDevice: e.target.checked }))}
            />
            Allow unapproved devices
          </label>
          {loading && <div className="text-xs text-text-secondary">Loading rules...</div>}
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
