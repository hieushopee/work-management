import React, { useEffect, useRef, useState } from "react";
import { Check, Clock, Filter, Plus } from "lucide-react";
import {
  fetchDeviceRequests,
  updateDeviceRequestStatus,
  createDeviceRequest,
} from "../../api/attendance";
import useUserStore from "../../stores/useUserStore";

const StatusBadge = ({ status }) => {
  const isApproved = status === "approved";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
        isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {isApproved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      {isApproved ? "Approved" : "Pending"}
    </span>
  );
};

const ActionDropdown = ({ status, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (status !== "pending") return null;
  return (
    <div
      ref={ref}
      className="relative inline-block align-middle overflow-visible"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="list-none cursor-pointer inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold shadow-sm"
      >
        Pending <span className="text-xs">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-32 rounded-lg border border-border-light bg-white shadow-lg z-50">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-600"
            onClick={() => {
              setOpen(false);
              onApprove();
            }}
          >
            Approve
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
            onClick={() => {
              setOpen(false);
              onReject();
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

const DevicesPage = () => {
  const { user } = useUserStore();
  const role = (user?.role || "").toLowerCase();
  const [rows, setRows] = useState([]);
  const [filterDept, setFilterDept] = useState("All");
  const [filterText, setFilterText] = useState("");
  const [form, setForm] = useState({ deviceId: "", deviceName: "" });
  const isStaff = role === "staff";
  const canReview = role === "admin" || role === "owner" || role === "manager";

  const load = async () => {
    try {
      const data = await fetchDeviceRequests();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load devices error", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (id, status) => {
    try {
      await updateDeviceRequestStatus(id, status);
      load();
    } catch (err) {
      console.error("Update status error", err);
      alert("Cannot update device status");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Devices</h1>
          <p className="text-text-secondary">
            {isStaff
              ? "Submit device registration/change requests and track your status."
              : "Review device requests; location permission required when checking in."}
          </p>
        </div>
      </div>

      {isStaff && (
        <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
            <Plus className="w-4 h-4" />
            Create device request
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">Device ID</label>
              <input
                value={form.deviceId}
                onChange={(e) => setForm((p) => ({ ...p, deviceId: e.target.value }))}
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. 1bc47a15"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">Device name</label>
              <input
                value={form.deviceName}
                onChange={(e) => setForm((p) => ({ ...p, deviceName: e.target.value }))}
                className="w-full rounded-lg border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. iPhone 14"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!form.deviceId || !form.deviceName) {
                  alert("Enter device ID and name");
                  return;
                }
                try {
                  await createDeviceRequest({
                    newDeviceId: form.deviceId,
                    newDeviceName: form.deviceName,
                    requireGps: true,
                  });
                  setForm({ deviceId: "", deviceName: "" });
                  load();
                } catch (err) {
                  console.error("Create device request error", err);
                  alert("Cannot submit request");
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow hover:bg-primary-hover"
            >
              Submit request
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4 w-full overflow-visible">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg bg-bg-secondary text-sm text-text-main">
            <Filter className="w-4 h-4" />
            {filterDept}
          </div>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search employee name..."
            className="px-3 py-2 rounded-lg border border-border-light text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-xl border border-border-light w-full overflow-visible">
          <table className="min-w-full w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Requester</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Reviewer</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Old device ID</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Old device name</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">New device ID</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">New device name</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Requested at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows
                .filter((row) =>
                  isStaff ? (row.user?._id || row.requesterId || row.requester) === user?._id : true
                )
                .map((row) => (
                <tr key={row._id || row.id} className="hover:bg-bg-secondary">
                  <td className="px-3 py-3 text-text-main font-semibold">
                    {row.user?.name || row.requester || "—"}
                  </td>
                  <td className="px-3 py-3 relative overflow-visible">
                    {row.status === "pending" && canReview ? (
                      <ActionDropdown
                        status={row.status}
                        onApprove={() => handleStatus(row._id || row.id, "approved")}
                        onReject={() => handleStatus(row._id || row.id, "rejected")}
                      />
                    ) : (
                      <StatusBadge status={row.status} />
                    )}
                  </td>
                  <td className="px-3 py-3 text-text-main">{row.reviewer?.name || row.actor || "—"}</td>
                  <td className="px-3 py-3 text-text-main">{row.oldDevice?.deviceId || "—"}</td>
                  <td className="px-3 py-3 text-text-main">{row.oldDevice?.deviceName || row.oldDevice?.deviceType || "—"}</td>
                  <td className="px-3 py-3 text-text-main">{row.newDevice?.deviceId || "—"}</td>
                  <td className="px-3 py-3 text-text-main">{row.newDevice?.deviceName || row.newDevice?.deviceType || "—"}</td>
                  <td className="px-3 py-3 text-text-main">
                    {row.requestedAt
                      ? new Date(row.requestedAt).toLocaleDateString("en-US")
                      : row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;
