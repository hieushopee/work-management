import { useEffect, useState } from 'react';
import { AlertCircle, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useSalarySettingsStore } from '../../stores/useSalarySettingsStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isStaff } from '../../utils/roleUtils';
import { formatDate } from '../../utils/formatDate';

const StaffReportsPage = () => {
  const { user } = useUserStore();
  const {
    reports,
    getAllReports,
    createReport,
    loading,
    actionLoading,
  } = useSalarySettingsStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bonus_error',
    period: '',
    description: '',
    expectedAmount: '',
    actualAmount: '',
    payrollId: '',
    proposalId: '',
  });

  useEffect(() => {
    if (!isStaff(user)) return;
    loadReports();
  }, [user]);

  const loadReports = async () => {
    try {
      await getAllReports();
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await createReport({
        ...formData,
        expectedAmount: parseFloat(formData.expectedAmount) || 0,
        actualAmount: parseFloat(formData.actualAmount) || 0,
      });
      setShowCreateModal(false);
      setFormData({
        type: 'bonus_error',
        period: '',
        description: '',
        expectedAmount: '',
        actualAmount: '',
        payrollId: '',
        proposalId: '',
      });
      loadReports();
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  if (!isStaff(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Staff only.</p>
        </div>
      </div>
    );
  }

  if (loading && !reports) {
    return <LoadingSpinner />;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'reviewing':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            My Reports
          </h1>
          <p className="text-text-secondary mt-1">Report salary discrepancies</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Expected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Difference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-text-secondary">
                    No reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {report.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{report.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.expectedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.actualAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={report.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.difference)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className="text-sm text-text-main capitalize">{report.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(report.createdAt)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-text-main">Create New Report</h2>
              <p className="text-sm text-text-secondary mt-1">Report salary or payroll discrepancies for this period.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="bonus_error">Bonus Error</option>
                  <option value="penalty_error">Penalty Error</option>
                  <option value="overtime_error">Overtime Error</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Period</label>
                <input
                  type="month"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Expected Amount (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Actual Amount (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.actualAmount}
                    onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
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
                disabled={actionLoading || !formData.period || !formData.description}
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

export default StaffReportsPage;

