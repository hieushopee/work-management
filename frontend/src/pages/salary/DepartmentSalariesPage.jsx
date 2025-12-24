import { useEffect, useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { useSalarySettingsStore } from '../../stores/useSalarySettingsStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isManager } from '../../utils/roleUtils';

const DepartmentSalariesPage = () => {
  const { user } = useUserStore();
  const {
    departmentSalaries,
    getDepartmentSalaries,
    loading,
  } = useSalarySettingsStore();

  const [periodFilter, setPeriodFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isManager(user)) return;
    loadSalaries();
  }, [user, periodFilter]);

  const loadSalaries = async () => {
    try {
      await getDepartmentSalaries(periodFilter);
    } catch (error) {
      console.error('Error loading salaries:', error);
    }
  };

  const filteredSalaries = departmentSalaries.filter((salary) => {
    if (!salary || !salary.userId) return false;
    const term = searchQuery.trim().toLowerCase();
    return (
      !term ||
      (salary.userId.name || '').toLowerCase().includes(term) ||
      (salary.userId.email || '').toLowerCase().includes(term)
    );
  });

  if (!isManager(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Manager only.</p>
        </div>
      </div>
    );
  }

  if (loading && !departmentSalaries) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Department Salaries
        </h1>
        <p className="text-text-secondary mt-1">View salaries for {user?.department || 'your department'}</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Salaries Table */}
      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Base Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Bonus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Penalty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Overtime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Period</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSalaries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-text-secondary">
                    No salaries found
                  </td>
                </tr>
              ) : (
                filteredSalaries.map((salary) => (
                  <tr key={salary.id} className="hover:bg-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-main">{salary.userId?.name || 'N/A'}</div>
                      <div className="text-sm text-text-secondary">{salary.userId?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary.baseSalary || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary.bonus || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary.penalty || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary.overtime || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-main">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary.totalSalary || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        salary.status === 'locked' ? 'bg-green-100 text-green-800' :
                        salary.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {salary.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{salary.period}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepartmentSalariesPage;

