import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { fetchForms, createForm, updateFormStatus } from "../../api/attendance";
import useUserStore from "../../stores/useUserStore";
import useEmployeeStore from "../../stores/useEmployeeStore";
import { toast } from "react-hot-toast";

const FormsPage = () => {
  const { user } = useUserStore();
  const { employees, getAllEmployees } = useEmployeeStore();
  const role = user?.role?.toLowerCase() || "staff";
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState({ open: false, type: "leave", reason: "", startDate: "", endDate: "" });
  const [filterUserId, setFilterUserId] = useState("all");

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canApprove = isAdmin || isManager;

  useEffect(() => {
    if (canApprove && !employees) {
      getAllEmployees?.();
    }
  }, [canApprove, employees, getAllEmployees]);

  const memberOptions = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    if (isManager && user?.department) {
      return list.filter(
        (e) => (e.department || e.departmentName || e.dept || "").trim() === (user.department || "").trim()
      );
    }
    return list;
  }, [employees, isManager, user?.department]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchForms();
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load forms error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!createModal.reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    try {
      await createForm({
        type: createModal.type,
        reason: createModal.reason.trim(),
        startDate: createModal.startDate,
        endDate: createModal.endDate,
      });
      toast.success("Submitted request");
      setCreateModal({ open: false, type: "leave", reason: "", startDate: "", endDate: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed");
    }
  };

  const handleApprove = async (formId) => {
    try {
      await updateFormStatus(formId, "approved");
      toast.success("Approved request");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approve failed");
    }
  };

  const handleReject = async (formId) => {
    try {
      await updateFormStatus(formId, "rejected");
      toast.success("Rejected request");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reject failed");
    }
  };

  // Staff: can only see their own requests; Admin/Manager: can see all (or filter by department) + filter by selection
  const displayForms = useMemo(() => {
    const base = Array.isArray(forms) ? forms : [];
    if (!canApprove) {
      return base.filter((f) => String(f.user?._id || f.userId) === String(user?._id || user?.id));
    }
    if (filterUserId !== "all") {
      return base.filter((f) => String(f.user?._id || f.userId || f.user) === filterUserId);
    }
    return base;
  }, [forms, canApprove, filterUserId, user?._id, user?.id]);

  const typeLabel = (t) => {
    const raw = String(t || "").trim();
    if (!raw) return "Unknown";
    const normalized = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (
      normalized.includes("leave") ||
      normalized.includes("nghi") ||
      normalized.includes("phep")
    ) {
      return "Leave";
    }
    if (
      normalized.includes("device") ||
      normalized.includes("thiet bi") ||
      normalized.includes("thay doi thiet")
    ) {
      return "Device change";
    }
    if (normalized.includes("other") || normalized.includes("khac")) {
      return "Other";
    }
    return raw;
  };

  return (
    <div className="p-6 space-y-4 bg-bg-secondary h-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Requests</h1>
          <p className="text-text-secondary">
            {canApprove ? "View and approve employee requests" : "Submit leave/device/other requests."}
          </p>
        </div>
        {canApprove ? (
          <div className="flex items-center gap-2 text-sm text-text-main">
            <span>Employee</span>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border-light bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              {memberOptions.map((m) => {
                const id = String(m._id || m.id || m.userId || "");
                return (
                  <option key={id} value={id}>
                    {m.name || m.email || "No name"}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <button
            onClick={() => setCreateModal({ open: true, type: "leave", reason: "", startDate: "", endDate: "" })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
          >
            <Plus className="w-4 h-4" />
            New request
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-sm space-y-4">
        <div className="rounded-xl border border-border-light overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Type</th>
                {canApprove && <th className="px-3 py-2 text-left font-semibold text-text-main">Requester</th>}
                <th className="px-3 py-2 text-left font-semibold text-text-main">Reason</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Start date</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">End date</th>
                <th className="px-3 py-2 text-left font-semibold text-text-main">Status</th>
                {canApprove && <th className="px-3 py-2 text-center font-semibold text-text-main">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={canApprove ? 7 : 5} className="px-3 py-8 text-center text-text-secondary">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && displayForms.length === 0 && (
                <tr>
                  <td colSpan={canApprove ? 7 : 5} className="px-3 py-8 text-center text-text-secondary">
                    No requests
                  </td>
                </tr>
              )}
              {!loading &&
                displayForms.map((form, idx) => (
                  <tr key={form._id || form.id || idx} className="hover:bg-bg-secondary">
                    <td className="px-3 py-2 text-text-main capitalize">{typeLabel(form.type)}</td>
                    {canApprove && (
                      <td className="px-3 py-2 text-text-main font-medium">
                        {form.user?.name || form.user?.email || "--"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-text-main">{form.reason || "--"}</td>
                    <td className="px-3 py-2 text-text-main">{form.startDate || "--"}</td>
                    <td className="px-3 py-2 text-text-main">{form.endDate || "--"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          form.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : form.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {form.status === "approved" ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </>
                        ) : form.status === "rejected" ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    {canApprove && (
                      <td className="px-3 py-2 text-center">
                        {form.status === "pending" && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(form._id || form.id)}
                              className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(form._id || form.id)}
                              className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {createModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-main">New request</h3>
                <p className="text-sm text-text-secondary">Fill in your request details</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Request type</label>
              <select
                value={createModal.type}
                onChange={(e) => setCreateModal((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="leave">Leave</option>
                <option value="device">Device change</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Reason *</label>
              <textarea
                value={createModal.reason}
                onChange={(e) => setCreateModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">From date</label>
                <input
                  type="date"
                  value={createModal.startDate}
                  onChange={(e) => setCreateModal((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">To date</label>
                <input
                  type="date"
                  value={createModal.endDate}
                  onChange={(e) => setCreateModal((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateModal({ open: false, type: "leave", reason: "", startDate: "", endDate: "" })}
                className="flex-1 px-4 py-2 rounded-lg border border-border-light text-text-main font-medium hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsPage;





