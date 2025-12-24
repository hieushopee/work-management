import { useEffect, useState } from 'react';
import { DollarSign, Calendar, FileText, TrendingUp, TrendingDown, RefreshCw, BarChart3, Clock } from 'lucide-react';
import { useSalaryStore } from '../../stores/useSalaryStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

const MySalaryPage = () => {
  const { salary, getSalaryByUserId, createAdjustmentRequest, getDailySalaryStats, dailyStats, loading, actionLoading } = useSalaryStore();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState('salary');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'increase',
    amount: '',
    reason: '',
    description: '',
  });
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  });

  useEffect(() => {
    if (user?.id) {
      getSalaryByUserId(user.id);
    }
  }, [user?.id, getSalaryByUserId]);

  useEffect(() => {
    if (activeTab === 'stats' && user?.id && dateRange.start && dateRange.end) {
      getDailySalaryStats(user.id, dateRange.start, dateRange.end);
    }
  }, [activeTab, user?.id, dateRange.start, dateRange.end, getDailySalaryStats]);

  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateRequest = async () => {
    if (!user?.id) return;
    try {
      await createAdjustmentRequest(user.id, requestForm);
      await getSalaryByUserId(user.id);
      setRequestModalOpen(false);
      setRequestForm({ type: 'increase', amount: '', reason: '', description: '' });
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

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

  if (loading && activeTab === 'salary') return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Personal</p>
        <h1 className="text-3xl font-bold text-slate-900">My Salary</h1>
        <p className="mt-1 text-sm text-slate-600">View your salary information and daily statistics</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border-light">
        <button
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'salary'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-main'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Salary Info
          </div>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-main'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Daily Statistics
          </div>
        </button>
      </div>

      {/* Salary Info Tab */}
      {activeTab === 'salary' && (
        <>

      {/* Current Salary Card */}
      <div className="bg-primary rounded-2xl p-8 mb-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-2">Current Base Salary</p>
            <p className="text-4xl font-bold mb-2">
              {salary ? formatCurrency(salary.baseSalary || 0, salary.currency || 'VND') : formatCurrency(0, 'VND')}
            </p>
            {salary?.effectiveDate && (
              <p className="text-sm opacity-80 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Effective from {formatDate(salary.effectiveDate)}
              </p>
            )}
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={() => setRequestModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-hover"
        >
          <FileText className="w-4 h-4" />
          Create Adjustment Request
        </button>
      </div>

      {/* Salary History */}
      {salary?.history && salary.history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
          <div className="p-6 border-b border-border-light">
            <h2 className="text-lg font-semibold text-text-main">Salary History</h2>
            <p className="text-sm text-text-secondary">Previous salary changes</p>
          </div>
          <div className="divide-y divide-gray-100">
            {salary.history
              .sort((a, b) => new Date(b.effectiveDate || b.createdAt) - new Date(a.effectiveDate || a.createdAt))
              .map((entry, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-text-main">
                          {formatCurrency(entry.baseSalary || 0, salary.currency || 'VND')}
                        </span>
                        {entry.changedBy && (
                          <span className="text-sm text-text-secondary">
                            by {entry.changedBy.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-text-secondary mb-2">{entry.reason}</p>
                      )}
                      {entry.effectiveDate && (
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.effectiveDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Adjustment Requests */}
      {salary?.adjustmentRequests && salary.adjustmentRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-border-light">
            <h2 className="text-lg font-semibold text-text-main">Adjustment Requests</h2>
            <p className="text-sm text-text-secondary">Your salary adjustment requests</p>
          </div>
          <div className="divide-y divide-gray-100">
            {salary.adjustmentRequests
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((request, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-text-main">
                          {getRequestTypeLabel(request.type)}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(request.amount || 0, salary?.currency || 'VND')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRequestStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-text-main mb-1">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      {request.description && (
                        <p className="text-sm text-text-secondary mb-2">{request.description}</p>
                      )}
                      {request.reviewedBy && (
                        <p className="text-xs text-text-secondary mb-1">
                          Reviewed by {request.reviewedBy.name || 'Unknown'} on {request.reviewedAt ? formatDate(request.reviewedAt) : ''}
                        </p>
                      )}
                      {request.reviewNote && (
                        <p className="text-xs text-text-secondary bg-bg-secondary p-2 rounded mt-2">
                          <strong>Note:</strong> {request.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Created on {request.createdAt ? formatDate(request.createdAt) : ''}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Create Adjustment Request</h3>
              <p className="text-sm text-text-secondary mt-1">Request a salary adjustment or reimbursement</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Request Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={requestForm.type}
                  onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="increase">Salary Increase</option>
                  <option value="decrease">Salary Decrease</option>
                  <option value="reimbursement">Reimbursement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  placeholder="Enter reason for this request"
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm min-h-[100px] resize-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
              <button
                onClick={() => {
                  setRequestModalOpen(false);
                  setRequestForm({ type: 'increase', amount: '', reason: '', description: '' });
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={actionLoading || !requestForm.amount || !requestForm.reason.trim()}
                className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Daily Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-text-main mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-text-main mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    setDateRange({
                      start: format(startOfMonth(now), 'yyyy-MM-dd'),
                      end: format(endOfMonth(now), 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-text-main bg-bg-hover rounded-lg hover:bg-gray-200 transition-colors"
                >
                  This Month
                </button>
                <button
                  onClick={() => {
                    const lastMonth = subMonths(new Date(), 1);
                    setDateRange({
                      start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                      end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-text-main bg-bg-hover rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Last Month
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {dailyStats && dailyStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-400 mb-1">Total Work Hours</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {dailyStats.reduce((sum, stat) => sum + (stat.workHours || 0), 0).toFixed(1)}h
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-400 mb-1">Base Salary</p>
                    <p className="text-3xl font-bold text-primary">
                      {salary ? formatCurrency(salary.baseSalary || 0, salary.currency || 'VND') : formatCurrency(0, 'VND')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-slate-400 mb-1">Estimated Salary</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(
                        dailyStats.reduce((sum, stat) => sum + (stat.estimatedSalary || 0), 0),
                        salary?.currency || 'VND'
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daily Statistics Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-border-light">
              <h2 className="text-lg font-semibold text-text-main">Daily Work Statistics</h2>
              <p className="text-sm text-text-secondary">Work hours and estimated salary by day</p>
            </div>
            {loading && activeTab === 'stats' ? (
              <div className="p-12 text-center">
                <LoadingSpinner />
              </div>
            ) : dailyStats && dailyStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-bg-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase font-semibold">Date</th>
                      <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase font-semibold">Work Hours</th>
                      <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase font-semibold">Events</th>
                      <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase font-semibold">Estimated Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyStats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-bg-secondary">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-text-muted" />
                            <span className="font-medium text-text-main">{formatDate(stat.date)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-text-main font-medium">{stat.workHours.toFixed(1)}h</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-text-main">{stat.eventsCount || 0} events</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-primary">
                            {formatCurrency(stat.estimatedSalary || 0, salary?.currency || 'VND')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-text-secondary">
                No statistics available for the selected date range
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalaryPage;

