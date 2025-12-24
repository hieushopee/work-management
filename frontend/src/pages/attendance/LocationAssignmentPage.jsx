import React, { useEffect, useMemo, useState } from "react";
import { Filter, X, CircleUserRoundIcon } from "lucide-react";
import axios from "../../libs/axios";
import { fetchLocations, updateLocation } from "../../api/attendance";

const uniqIds = (arr = []) => Array.from(new Set(arr.map((x) => (typeof x === "string" ? x : x?._id || x?.id)))).filter(Boolean);

const AssignModal = ({ open, onClose, employees, locations, onSubmit, flexibleDefault }) => {
  const [selectedLocations, setSelectedLocations] = useState(() => new Set());
  const [flexible, setFlexible] = useState(flexibleDefault);

  useEffect(() => {
    setFlexible(flexibleDefault);
  }, [flexibleDefault]);

  // Prefill existing locations that already include these employees to avoid missing selections
  useEffect(() => {
    if (!open) return;
    const withEmployees = locations.filter((loc) =>
      employees.some((emp) =>
        (loc.allowedEmployees || []).some((id) => (id?._id || id || "").toString() === (emp._id || emp.id || ""))
      )
    );
    if (withEmployees.length > 0) {
      setSelectedLocations(new Set(withEmployees.map((l) => l._id || l.id)));
    } else {
      setSelectedLocations(new Set());
    }
  }, [open, employees, locations]);

  if (!open) return null;

  const toggleLocation = (id) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLocations(new Set(locations.map((l) => l._id || l.id)));
    } else {
      setSelectedLocations(new Set());
    }
  };

  const handleSubmit = () => {
    if (selectedLocations.size === 0) {
      alert("Select at least one location");
      return;
    }
    onSubmit?.({ locationIds: Array.from(selectedLocations), flexible });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main">Assign locations</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-auto">
          <div className="text-sm font-medium text-text-main">Employees selected: {employees.length}</div>
          <div className="flex gap-2 flex-wrap text-xs">
            {employees.map((e) => (
              <span key={e._id || e.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-bg-hover border border-border-light text-text-main">
                {e.avatar ? (
                  <img
                    src={e.avatar}
                    alt={e.name || e.email}
                    className="h-6 w-6 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary-light flex items-center justify-center">
                    <CircleUserRoundIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                {e.name || e.email}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-text-main">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary rounded border-border-light"
                checked={flexible}
                onChange={(e) => setFlexible(e.target.checked)}
              />
              Flexible mode (employees can check in at any selected location)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text-main">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border-light text-primary"
                checked={selectedLocations.size === locations.length && locations.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              Select all locations
            </label>
            <div className="grid grid-cols-1 gap-2">
              {locations.map((loc) => (
                <label key={loc._id || loc.id} className="flex items-center gap-2 text-sm text-text-main">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border-light text-primary"
                    checked={selectedLocations.has(loc._id || loc.id)}
                    onChange={() => toggleLocation(loc._id || loc.id)}
                  />
                  <span className="font-semibold text-primary">{loc.name}</span>
                  <span className="text-text-secondary">· {loc.radiusMeters || 50}m</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-main border border-border-light rounded-lg hover:bg-bg-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

const LocationAssignmentPage = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(() => new Set());
  const [openAssign, setOpenAssign] = useState(false);
  const [flexibleAll, setFlexibleAll] = useState(false);

  const loadData = async () => {
    try {
      const [empRes, locs] = await Promise.all([
        axios.get("/employees/all").then((r) => {
          const list = r.data?.users || r.data?.employees || r.data || [];
          return Array.isArray(list) ? list : [];
        }),
        fetchLocations(),
      ]);
      setEmployees(empRes);
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      console.error("Load location assignment error", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const canContinue = selectedEmployees.size > 0;

  const handleSubmitAssign = async ({ locationIds, flexible }) => {
    const employeeIds = Array.from(selectedEmployees);
    const selectedLocationIds = new Set(locationIds.map(id => String(id)));
    
    try {
      // Update all locations: add employees to selected locations, remove from unselected
      await Promise.all(
        locations.map(async (loc) => {
          const locId = loc._id || loc.id;
          const isSelected = selectedLocationIds.has(String(locId));
          const current = loc;
          
          // Handle allowedEmployees
          let allowedEmployees = [...(current.allowedEmployees || [])];
          if (isSelected) {
            // Add employees to selected locations
            allowedEmployees = uniqIds([...allowedEmployees, ...employeeIds]);
          } else {
            // Remove employees from unselected locations
            const employeeIdStrings = employeeIds.map(id => String(id));
            allowedEmployees = allowedEmployees.filter(
              (id) => !employeeIdStrings.includes(String(id?._id || id?.id || id))
            );
          }
          
          // Handle flexibleEmployees
          let flexibleEmployees = [...(current.flexibleEmployees || [])];
          if (isSelected && flexible) {
            // Add to flexibleEmployees if selected and flexible = true
            flexibleEmployees = uniqIds([...flexibleEmployees, ...employeeIds]);
          } else {
            // Remove if not selected or flexible = false
            const employeeIdStrings = employeeIds.map(id => String(id));
            flexibleEmployees = flexibleEmployees.filter(
              (id) => !employeeIdStrings.includes(String(id?._id || id?.id || id))
            );
          }
          
          await updateLocation(locId, {
            name: current.name,
            radiusMeters: current.radiusMeters,
            latitude: current.latitude,
            longitude: current.longitude,
            allowedEmployees,
            flexibleEmployees,
            allowedDepartments: current.allowedDepartments || [],
          });
        })
      );
      setOpenAssign(false);
      setSelectedEmployees(new Set());
      loadData();
    } catch (err) {
      console.error("Update location assignment error", err);
      alert("Cannot update location assignment");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-main">Location assignment</h1>
          <label className="flex items-center gap-2 text-sm text-text-main">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary rounded border-border-light"
              checked={flexibleAll}
              onChange={(e) => setFlexibleAll(e.target.checked)}
            />
            Flexible mode (employees can check in without location validation)
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium text-text-main hover:bg-bg-secondary inline-flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Department
          </button>
          <input
            placeholder="Employee name..."
            className="px-3 py-2 rounded-lg border border-border-light text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => setOpenAssign(true)}
            disabled={!canContinue}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow ${
              canContinue ? "bg-primary text-white hover:bg-primary-hover" : "bg-gray-200 text-text-secondary cursor-not-allowed"
            }`}
          >
            Assign locations
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border-light"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees(new Set(rows.map((r) => r._id || r.id)));
                      } else {
                        setSelectedEmployees(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Employee name</th>
                <th className="px-3 py-2 text-center font-semibold text-text-main">Flexible mode</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Assigned locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row._id || row.id} className="hover:bg-bg-secondary">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border-light"
                      checked={selectedEmployees.has(row._id || row.id)}
                      onChange={(e) => {
                        setSelectedEmployees((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(row._id || row.id);
                          else next.delete(row._id || row.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-3 text-text-main font-semibold flex items-center gap-2">
                    {row.avatar ? (
                      <img
                        src={row.avatar}
                        alt={row.name || row.email}
                        className="h-8 w-8 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
                        <CircleUserRoundIcon className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    {row.name || row.email}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      readOnly
                      checked={locations.some((loc) => (loc.flexibleEmployees || []).some((id) => id?.toString() === (row._id || row.id)))}
                      className="w-4 h-4 rounded border-border-light text-primary"
                    />
                  </td>
                  <td className="px-3 py-3 text-text-main">
                    {(() => {
                      const assigned = locations
                        .filter((loc) =>
                          (loc.allowedEmployees || []).some(
                            (id) => (id?._id || id || "").toString() === (row._id || row.id || "").toString()
                          )
                        )
                        .map((l) => l.name)
                        .filter(Boolean);
                      return assigned.length ? assigned.join(", ") : "—";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-text-main">
          <span>{selectedEmployees.size} employees selected</span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-border-light text-text-main hover:bg-bg-secondary text-sm font-medium"
              onClick={() => setSelectedEmployees(new Set())}
            >
              Clear
            </button>
            <button
              disabled={!canContinue}
              onClick={() => setOpenAssign(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                canContinue ? "bg-primary text-white hover:bg-primary-hover" : "bg-gray-200 text-text-secondary cursor-not-allowed"
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      <AssignModal
        open={openAssign}
        onClose={() => setOpenAssign(false)}
        employees={Array.from(selectedEmployees).map((id) => rows.find((r) => (r._id || r.id) === id) || { id })}
        locations={locations}
        onSubmit={handleSubmitAssign}
        flexibleDefault={flexibleAll}
      />
    </div>
  );
};

export default LocationAssignmentPage;
