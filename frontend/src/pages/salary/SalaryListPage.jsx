import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SquarePenIcon, DollarSign, Building2, User, Download, Upload, CheckCircle2, Lock, Info, TrendingUp, TrendingDown, Clock, CircleUserRoundIcon, X, FileText } from 'lucide-react';
import { useSalaryStore } from '../../stores/useSalaryStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin, isManager } from '../../utils/roleUtils';
import { formatDate } from '../../utils/formatDate';
import { toast } from 'react-hot-toast';

const SalaryListPage = () => {
  const navigate = useNavigate();
  const { payrolls, getPayrolls, upsertPayroll, approvePayroll, lockPayroll, exportPayrollsToExcel, importPayrollsFromExcel, loading, actionLoading, salaries, getAllSalaries, reviewAdjustmentRequest } = useSalaryStore();
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editForm, setEditForm] = useState({ baseSalary: '', bonus: '', penalty: '', overtime: '', currency: 'VND', notes: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requestsSearchQuery, setRequestsSearchQuery] = useState('');
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('pending');

  useEffect(() => {
    getAllUsers();
    loadPayrolls();
    getAllSalaries();
  }, [periodFilter, statusFilter]);

  useEffect(() => {
    if (showRequestsModal) {
      getAllSalaries();
    }
  }, [showRequestsModal, getAllSalaries]);

  const loadPayrolls = async () => {
    try {
      const params = {};
      if (periodFilter) params.period = periodFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      await getPayrolls(params);
    } catch (error) {
      console.error('Error loading payrolls:', error);
    }
  };

  const filteredPayrolls = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return (payrolls || []).filter((payroll) => {
      if (!payroll || !payroll.userId) return false;
      const user = payroll.userId;
      // Filter out admin users
      if (user.role === 'admin') return false;
      const matchesTerm = !term ||
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.department || '').toLowerCase().includes(term);
      const matchesDept = departmentFilter === 'all' || (user.department || '').toLowerCase() === departmentFilter;
      return matchesTerm && matchesDept;
    });
  }, [payrolls, searchQuery, departmentFilter]);

  const departmentOptions = useMemo(() => {
    const set = new Set();
    (payrolls || []).forEach((payroll) => {
      if (payroll?.userId?.department) {
        set.add(payroll.userId.department);
      }
    });
    return ['all', ...Array.from(set)];
  }, [payrolls]);

  // Generate period options (last 12 months)
  const periodOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: period, label });
    }
    return options;
  }, []);

  const handleEdit = (payroll) => {
    setEditingPayroll(payroll);
    setEditForm({
      baseSalary: String(payroll.baseSalary || 0),
      bonus: String(payroll.bonus || 0),
      penalty: String(payroll.penalty || 0),
      overtime: String(payroll.overtime || 0),
      currency: payroll.currency || 'VND',
      notes: payroll.notes || '',
    });
  };

  const handleSave = async () => {
    if (!editingPayroll) return;
    try {
      await upsertPayroll({
        userId: editingPayroll.userId.id || editingPayroll.userId._id,
        period: editingPayroll.period,
        baseSalary: Number(editForm.baseSalary),
        bonus: Number(editForm.bonus),
        penalty: Number(editForm.penalty),
        overtime: Number(editForm.overtime),
        currency: editForm.currency,
        notes: editForm.notes,
      });
      await loadPayrolls();
      setEditingPayroll(null);
      setEditForm({ baseSalary: '', bonus: '', penalty: '', overtime: '', currency: 'VND', notes: '' });
    } catch (error) {
      console.error('Error saving payroll:', error);
    }
  };

  const handleApprove = async (payrollId) => {
    try {
      await approvePayroll(payrollId);
      await loadPayrolls();
    } catch (error) {
      console.error('Error approving payroll:', error);
    }
  };

  const handleLock = async (payrollId) => {
    try {
      await lockPayroll(payrollId);
      await loadPayrolls();
    } catch (error) {
      console.error('Error locking payroll:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (periodFilter) params.period = periodFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      await exportPayrollsToExcel(params);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }
    try {
      await importPayrollsFromExcel(importFile);
      setShowImportModal(false);
      setImportFile(null);
      await loadPayrolls();
    } catch (error) {
      console.error('Error importing:', error);
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount && amount !== 0) return '0';
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAvatarInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-primary', 'bg-emerald-500'];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'locked':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-bg-hover text-text-main"><Lock className="w-3 h-3" /> Locked</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-light text-primary">Admin</span>;
    }
    if (role === 'manager') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-light text-primary">Manager</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-light text-primary">Staff</span>;
  };

  // Collect all requests from salaries
  const allRequests = useMemo(() => {
    const requests = [];
    (salaries || []).forEach((salary) => {
      if (salary?.adjustmentRequests && Array.isArray(salary.adjustmentRequests)) {
        salary.adjustmentRequests.forEach((request) => {
          requests.push({
            ...request,
            salaryId: salary.id,
            userId: salary.userId?.id || salary.userId?._id,
            userName: salary.userId?.name || 'Unknown',
            userEmail: salary.userId?.email || '',
            userDepartment: salary.userId?.department || '',
            userAvatar: salary.userId?.avatar || null,
          });
        });
      }
    });
    return requests;
  }, [salaries]);

  const filteredRequests = useMemo(() => {
    const term = requestsSearchQuery.trim().toLowerCase();
    return allRequests.filter((request) => {
      const matchesTerm = !term ||
        (request.userName || '').toLowerCase().includes(term) ||
        (request.userEmail || '').toLowerCase().includes(term) ||
        (request.reason || '').toLowerCase().includes(term);
      const matchesStatus = requestsStatusFilter === 'all' || request.status === requestsStatusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [allRequests, requestsSearchQuery, requestsStatusFilter]);

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'increase':
        return 'Salary Increase';
      case 'decrease':
        return 'Salary Decrease';
      case 'reimbursement':
        return 'Reimbursement';
      default:
        return type;
    }
  };

  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'increase':
        return 'bg-emerald-100 text-emerald-700';
      case 'decrease':
        return 'bg-orange-100 text-orange-700';
      case 'reimbursement':
        return 'bg-primary-light text-primary';
      default:
        return 'bg-bg-hover text-text-main';
    }
  };

  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-bg-hover text-text-main';
    }
  };

  // Calculate summary
  const summary = useMemo(() => {
    const total = filteredPayrolls.length;
    const totalBaseSalary = filteredPayrolls.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
    const totalBonus = filteredPayrolls.reduce((sum, p) => sum + (p.bonus || 0), 0);
    const totalPenalty = filteredPayrolls.reduce((sum, p) => sum + (p.penalty || 0), 0);
    const totalOvertime = filteredPayrolls.reduce((sum, p) => sum + (p.overtime || 0), 0);
    const overallTotal = filteredPayrolls.reduce((sum, p) => sum + (p.totalSalary || 0), 0);
    return { total, totalBaseSalary, totalBonus, totalPenalty, totalOvertime, overallTotal };
  }, [filteredPayrolls]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Salary Management</p>
        <h1 className="text-3xl font-bold text-slate-900">Payroll List</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isAdmin(user) 
            ? 'View and manage payrolls for all employees in the company'
            : 'View and manage payrolls for employees in your department'}
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-text-main placeholder:text-text-muted focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Departments</option>
            {departmentOptions.filter(d => d !== 'all').map((dept) => (
              <option key={dept} value={dept.toLowerCase()}>{dept}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="locked">Locked</option>
          </select>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-border-light text-text-main px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-bg-secondary transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {pendingRequestsCount > 0 && (
            <button
              onClick={() => setShowRequestsModal(true)}
              className="relative inline-flex items-center gap-2 rounded-lg bg-white border border-border-light text-text-main px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-bg-secondary transition-colors"
            >
              <Info className="w-4 h-4" />
              Requests
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingRequestsCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-primary text-white sticky top-0">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Employee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Base Salary</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Bonus</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Penalty</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Overtime</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Total Salary</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-text-secondary">
                    No payrolls found
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll, idx) => {
                  const user = payroll.userId;
                  const isEditing = editingPayroll?.id === payroll.id;
                  
                  return (
                    <tr key={payroll.id || idx} className="border-b border-border-light hover:bg-bg-secondary">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                              <CircleUserRoundIcon className="h-10 w-10 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="text-text-main font-medium">{user?.name || 'Unknown'}</div>
                            <div className="text-xs text-text-secondary">{user?.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getRoleBadge(user?.role)}</td>
                      <td className="py-3 px-4 text-text-main">{user?.department || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-text-main">
                          {formatCurrency(payroll.baseSalary || 0, payroll.currency || 'VND')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {payroll.bonus > 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <TrendingUp className="w-4 h-4" />
                            {formatCurrency(payroll.bonus, payroll.currency || 'VND')}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {payroll.penalty > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                            <TrendingDown className="w-4 h-4" />
                            {formatCurrency(payroll.penalty, payroll.currency || 'VND')}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {payroll.overtime > 0 ? (
                          <span className="text-blue-600 font-medium">
                            {formatCurrency(payroll.overtime, payroll.currency || 'VND')}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-primary">
                          {formatCurrency(payroll.totalSalary || 0, payroll.currency || 'VND')}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(payroll.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(payroll)}
                            className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                            title="Edit Payroll"
                          >
                            <SquarePenIcon className="w-4 h-4 text-text-secondary" />
                          </button>
                          {payroll.status !== 'locked' && (
                            <button
                              onClick={() => handleLock(payroll.id)}
                              className="p-1.5 hover:bg-bg-hover rounded transition-colors"
                              title="Lock Payroll"
                            >
                              <Lock className="w-4 h-4 text-text-secondary" />
                            </button>
                          )}
                          {payroll.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(payroll.id)}
                              className="p-1.5 hover:bg-green-100 rounded transition-colors"
                              title="Approve Payroll"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Row */}
        {filteredPayrolls.length > 0 && (
          <div className="bg-primary-light border-t border-primary/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-text-main font-semibold">
                <DollarSign className="w-4 h-4" />
                Total Summary ({summary.total} employees)
              </div>
              <div className="flex items-center gap-6">
                <div className="text-text-main">
                  <span className="font-semibold">Base: </span>
                  {formatCurrency(summary.totalBaseSalary, filteredPayrolls[0]?.currency || 'VND')}
                </div>
                <div className="text-green-600">
                  <span className="font-semibold">Bonus: </span>
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {formatCurrency(summary.totalBonus, filteredPayrolls[0]?.currency || 'VND')}
                  </span>
                </div>
                <div className="text-red-600">
                  <span className="font-semibold">Penalty: </span>
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {formatCurrency(summary.totalPenalty, filteredPayrolls[0]?.currency || 'VND')}
                  </span>
                </div>
                <div className="text-blue-600">
                  <span className="font-semibold">Overtime: </span>
                  {formatCurrency(summary.totalOvertime, filteredPayrolls[0]?.currency || 'VND')}
                </div>
                <div className="text-primary font-bold text-base">
                  <span className="font-semibold">Total: </span>
                  {formatCurrency(summary.overallTotal, filteredPayrolls[0]?.currency || 'VND')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Payroll Modal */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/20 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100 border border-border-light">
            <div className="p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Edit Payroll</h3>
              <p className="text-sm text-text-secondary mt-1">Period: {editingPayroll.period}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Base Salary <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editForm.baseSalary}
                  onChange={(e) => setEditForm({ ...editForm, baseSalary: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Bonus</label>
                <input
                  type="number"
                  value={editForm.bonus}
                  onChange={(e) => setEditForm({ ...editForm, bonus: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Penalty</label>
                <input
                  type="number"
                  value={editForm.penalty}
                  onChange={(e) => setEditForm({ ...editForm, penalty: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Overtime</label>
                <input
                  type="number"
                  value={editForm.overtime}
                  onChange={(e) => setEditForm({ ...editForm, overtime: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm min-h-[80px] resize-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="bg-primary-50 rounded-lg p-3">
                <div className="text-sm text-text-main">
                  <span className="font-semibold">Total Salary: </span>
                  <span className="text-primary font-bold">
                    {formatCurrency(
                      (Number(editForm.baseSalary) || 0) + 
                      (Number(editForm.bonus) || 0) - 
                      (Number(editForm.penalty) || 0) + 
                      (Number(editForm.overtime) || 0),
                      editForm.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
              <button
                onClick={() => {
                  setEditingPayroll(null);
                  setEditForm({ baseSalary: '', bonus: '', penalty: '', overtime: '', currency: 'VND', notes: '' });
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || !editForm.baseSalary}
                className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/20 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl transform transition-all scale-100 border border-border-light">
            <div className="p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Import Payrolls from Excel</h3>
              <p className="text-sm text-text-secondary mt-1">Upload an Excel file to import payroll data</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Required columns:</strong> Employee ID, Period, Base Salary, Bonus, Penalty, Overtime, Currency, Status, Notes
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={actionLoading || !importFile}
                className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Modal */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRequestsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-light flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-main">Adjustment Requests</h2>
                <p className="text-sm text-text-secondary mt-1">Review and approve salary adjustment requests</p>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border-light flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name, email, or reason..."
                  value={requestsSearchQuery}
                  onChange={(e) => setRequestsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-border-light bg-white text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={requestsStatusFilter}
                onChange={(e) => setRequestsStatusFilter(e.target.value)}
                className="rounded-lg border border-border-light bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Requests List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request, idx) => (
                    <div key={idx} className="p-4 border border-border-light rounded-lg hover:bg-bg-secondary">
                      <div className="flex items-start gap-4">
                        {request.userAvatar ? (
                          <img src={request.userAvatar} alt={request.userName} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                            <CircleUserRoundIcon className="h-10 w-10 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-text-main">{request.userName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRequestTypeColor(request.type)}`}>
                              {getRequestTypeLabel(request.type)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRequestStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mb-1">{request.userEmail}</p>
                          {request.userDepartment && (
                            <p className="text-xs text-text-secondary flex items-center gap-1 mb-3">
                              <Building2 className="w-3 h-3" />
                              {request.userDepartment}
                            </p>
                          )}
                          <div className="mb-2">
                            <p className="text-sm text-text-main">
                              <strong>Amount:</strong>{' '}
                              <span className="font-semibold text-primary">
                                {formatCurrency(request.amount || 0, 'VND')}
                              </span>
                            </p>
                            <p className="text-sm text-text-main mt-1">
                              <strong>Reason:</strong> {request.reason}
                            </p>
                            {request.description && (
                              <p className="text-sm text-text-secondary mt-1">{request.description}</p>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">
                            Created on {request.createdAt ? formatDate(request.createdAt) : ''}
                          </p>
                          {request.reviewedBy && (
                            <p className="text-xs text-text-secondary mt-1">
                              Reviewed by {request.reviewedBy.name || 'Unknown'} on {request.reviewedAt ? formatDate(request.reviewedAt) : ''}
                            </p>
                          )}
                          {request.reviewNote && (
                            <p className="text-xs text-text-secondary bg-bg-secondary p-2 rounded mt-2">
                              <strong>Review Note:</strong> {request.reviewNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryListPage;
