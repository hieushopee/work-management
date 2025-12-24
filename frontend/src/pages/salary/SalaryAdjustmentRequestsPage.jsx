import { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, FileText, User, Building2 } from 'lucide-react';
import { useSalaryStore } from '../../stores/useSalaryStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';

const SalaryAdjustmentRequestsPage = () => {
  const { salaries, getAllSalaries, reviewAdjustmentRequest, loading, actionLoading } = useSalaryStore();
  const { user } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', reviewNote: '' });

  useEffect(() => {
    getAllSalaries();
  }, [getAllSalaries]);

  // Collect all pending requests from all salaries
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
    const term = searchQuery.trim().toLowerCase();
    return allRequests.filter((request) => {
      const matchesTerm = !term ||
        (request.userName || '').toLowerCase().includes(term) ||
        (request.userEmail || '').toLowerCase().includes(term) ||
        (request.reason || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [allRequests, searchQuery, statusFilter]);

  const pendingCount = allRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'rejected').length;

  const handleReview = (request) => {
    setReviewingRequest(request);
    setReviewForm({ status: 'approved', reviewNote: '' });
  };

  const handleSubmitReview = async () => {
    if (!reviewingRequest) return;
    try {
      await reviewAdjustmentRequest(
        reviewingRequest.userId,
        reviewingRequest._id || reviewingRequest.id,
        reviewForm
      );
      await getAllSalaries();
      setReviewingRequest(null);
      setReviewForm({ status: 'approved', reviewNote: '' });
    } catch (error) {
      console.error('Error reviewing request:', error);
    }
  };

  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
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

  const getRequestTypeColor = (type) => {
    switch (type) {
      case 'increase':
        return 'bg-emerald-100 text-emerald-700';
      case 'decrease':
        return 'bg-orange-100 text-orange-700';
      case 'reimbursement':
        return 'bg-blue-100 text-blue-700';
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Salary Management</p>
        <h1 className="text-3xl font-bold text-slate-900">Adjustment Requests</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review and approve salary adjustment requests from staff
        </p>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 mb-1">Approved</p>
              <p className="text-3xl font-bold text-emerald-600">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-text-main placeholder:text-text-muted focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main">
            Requests ({filteredRequests.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-text-secondary">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
            </div>
          ) : (
            filteredRequests.map((request, idx) => (
              <div key={idx} className="p-6 hover:bg-bg-secondary">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {request.userAvatar ? (
                      <img src={request.userAvatar} alt={request.userName} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${getAvatarColor(request.userName)} text-white flex items-center justify-center font-semibold`}>
                        {getAvatarInitials(request.userName)}
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
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleReview(request)}
                      className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover whitespace-nowrap"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-main">Review Request</h3>
              <p className="text-sm text-text-secondary mt-1">Approve or reject this adjustment request</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-bg-secondary p-4 rounded-lg">
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Employee:</strong> {reviewingRequest.userName}
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Type:</strong> {getRequestTypeLabel(reviewingRequest.type)}
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Amount:</strong> {formatCurrency(reviewingRequest.amount || 0, 'VND')}
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Reason:</strong> {reviewingRequest.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Decision <span className="text-red-500">*</span>
                </label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-2">
                  Review Note (Optional)
                </label>
                <textarea
                  value={reviewForm.reviewNote}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewNote: e.target.value })}
                  placeholder="Add a note about your decision..."
                  className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm min-h-[100px] resize-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-light">
              <button
                onClick={() => {
                  setReviewingRequest(null);
                  setReviewForm({ status: 'approved', reviewNote: '' });
                }}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={actionLoading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                  reviewForm.status === 'approved'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Processing...' : reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryAdjustmentRequestsPage;



