import { useEffect, useState } from 'react';
import { TrendingUp, Plus, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { useSalarySettingsStore } from '../../stores/useSalarySettingsStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isManager } from '../../utils/roleUtils';
import { formatDate } from '../../utils/formatDate';

const ManagerProposalsPage = () => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const {
    proposals,
    getAllProposals,
    createProposal,
    loading,
    actionLoading,
  } = useSalarySettingsStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    targetUserId: '',
    type: 'bonus',
    amount: '',
    reason: '',
    description: '',
    period: '',
    metadata: {},
  });

  useEffect(() => {
    if (!isManager(user)) return;
    getAllUsers();
    loadProposals();
  }, [user]);

  const loadProposals = async () => {
    try {
      await getAllProposals();
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await createProposal(formData);
      setShowCreateModal(false);
      setFormData({
        targetUserId: '',
        type: 'bonus',
        amount: '',
        reason: '',
        description: '',
        period: '',
        metadata: {},
      });
      loadProposals();
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  // Filter employees by department
  const departmentEmployees = employees.filter(
    (emp) => emp.department === user?.department && emp.id !== user?.id
  );

  if (!isManager(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Manager only.</p>
        </div>
      </div>
    );
  }

  if (loading && !proposals) {
    return <LoadingSpinner />;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            My Proposals
          </h1>
          <p className="text-text-secondary mt-1">Create and manage salary proposals for your department</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-text-secondary">
                    No proposals found
                  </td>
                </tr>
              ) : (
                proposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {proposal.targetUserId?.avatar ? (
                          <img
                            src={proposal.targetUserId.avatar}
                            alt={proposal.targetUserId.name}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-text-main">{proposal.targetUserId?.name || 'N/A'}</div>
                          <div className="text-sm text-text-secondary">{proposal.targetUserId?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {proposal.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(proposal.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-main max-w-xs truncate">{proposal.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{proposal.period || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proposal.status)}
                        <span className="text-sm text-text-main capitalize">{proposal.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(proposal.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-text-main bg-opacity-20 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-text-main mb-4">Create New Proposal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Employee</label>
                <select
                  value={formData.targetUserId}
                  onChange={(e) => setFormData({ ...formData, targetUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select employee</option>
                  {departmentEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="bonus">Bonus</option>
                  <option value="penalty">Penalty</option>
                  <option value="overtime">Overtime</option>
                  <option value="kpi">KPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Amount (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Period (YYYY-MM)</label>
                <input
                  type="text"
                  placeholder="2025-11"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading || !formData.targetUserId || !formData.amount || !formData.reason}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerProposalsPage;

