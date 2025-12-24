import { useEffect, useState, useMemo } from 'react';
import { UserCog, Search, Save, DollarSign, User, Building2, Edit2 } from 'lucide-react';
import { useSalaryStore } from '../../stores/useSalaryStore';
import useUserStore from '../../stores/useUserStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin } from '../../utils/roleUtils';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/formatDate';

const BaseSalarySettingsPage = () => {
  const { user, checkingAuth } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { salaries, getAllSalaries, updateSalary, loading, actionLoading } = useSalaryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    baseSalary: '',
    currency: 'VND',
    reason: '',
  });

  useEffect(() => {
    // Only load data if user is admin and user is loaded (not checking auth)
    if (checkingAuth || !user || !isAdmin(user)) return;
    loadData();
  }, [user, checkingAuth]);

  const loadData = async () => {
    if (!user || !isAdmin(user)) return;
    try {
      await Promise.all([getAllUsers(), getAllSalaries()]);
    } catch (error) {
      // Don't show error if it's 401 (unauthorized) - user might not be logged in yet
      if (error.response?.status !== 401) {
        console.error('Error loading data:', error);
      }
    }
  };

  // Filter employees (exclude admin)
  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    const term = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      // Skip admin users
      if (emp.role === 'admin') return false;
      
      const matchesTerm = !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term);
      const matchesDept = departmentFilter === 'all' || (emp.department || '').toLowerCase() === departmentFilter;
      return matchesTerm && matchesDept;
    });
  }, [employees, searchQuery, departmentFilter]);

  // Get salary for each employee
  const employeesWithSalary = useMemo(() => {
    if (!filteredEmployees || !Array.isArray(filteredEmployees)) return [];
    if (!salaries || !Array.isArray(salaries)) return filteredEmployees.map(emp => ({
      ...emp,
      salary: null,
      baseSalary: 0,
      effectiveDate: null,
    }));
    return filteredEmployees.map((emp) => {
      const salary = salaries.find((s) => s.userId?.id === emp.id || s.userId?._id?.toString() === emp.id);
      return {
        ...emp,
        salary: salary || null,
        baseSalary: salary?.baseSalary || 0,
        effectiveDate: salary?.effectiveDate || null,
      };
    });
  }, [filteredEmployees, salaries]);

  const departmentOptions = useMemo(() => {
    const set = new Set();
    filteredEmployees.forEach((emp) => {
      if (emp.department) {
        set.add(emp.department);
      }
    });
    return ['all', ...Array.from(set)];
  }, [filteredEmployees]);

  // Format number with thousand separators
  const formatNumber = (value) => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    // Add thousand separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse formatted number back to numeric value
  const parseNumber = (formattedValue) => {
    return formattedValue.replace(/\./g, '');
  };

  const handleEdit = (employee) => {
    const salary = salaries.find((s) => s.userId?.id === employee.id || s.userId?._id?.toString() === employee.id);
    setEditingEmployee(employee);
    const baseSalary = salary?.baseSalary || 0;
    setEditForm({
      baseSalary: baseSalary > 0 ? formatNumber(String(baseSalary)) : '',
      currency: salary?.currency || 'VND',
      reason: '',
    });
  };

  const handleSave = async () => {
    if (!editingEmployee) return;

    try {
      // Parse the formatted number (remove dots)
      const numericValue = parseNumber(editForm.baseSalary);
      const baseSalary = parseFloat(numericValue) || 0;
      if (baseSalary < 0) {
        toast.error('Base salary must be greater than or equal to 0');
        return;
      }

      await updateSalary(editingEmployee.id, {
        baseSalary,
        currency: editForm.currency,
        reason: editForm.reason || 'Base salary updated',
      });

      toast.success('Base salary updated successfully');
      setEditingEmployee(null);
      setEditForm({ baseSalary: '', currency: 'VND', reason: '' });
      loadData();
    } catch (error) {
      console.error('Error updating salary:', error);
    }
  };

  const handleBaseSalaryChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatNumber(inputValue);
    setEditForm({ ...editForm, baseSalary: formatted });
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setEditForm({ baseSalary: '', currency: 'VND', reason: '' });
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading && !salaries) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <UserCog className="w-6 h-6" />
          Base Salary Settings
        </h1>
        <p className="text-text-secondary mt-1">Set base salary for each employee</p>
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
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Departments</option>
            {departmentOptions.filter(d => d !== 'all').map((dept) => (
              <option key={dept} value={dept.toLowerCase()}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Base Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Effective Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employeesWithSalary.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-text-secondary">
                    No employees found
                  </td>
                </tr>
              ) : (
                employeesWithSalary.map((employee) => (
                  <tr key={employee.id} className="hover:bg-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={employee.name}
                            className="w-10 h-10 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center mr-3">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-text-main">{employee.name || 'N/A'}</div>
                          <div className="text-sm text-text-secondary">{employee.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-main">{employee.department || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        employee.role === 'staff' ? 'bg-green-100 text-green-800' :
                        'bg-bg-hover text-text-main'
                      }`}>
                        {employee.role || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-text-muted" />
                        <span className="text-sm font-medium text-text-main">
                          {employee.baseSalary > 0
                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: employee.salary?.currency || 'VND' }).format(employee.baseSalary)
                            : 'Not set'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {employee.salary?.currency || 'VND'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {employee.effectiveDate ? formatDate(employee.effectiveDate) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary-hover hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        {employee.baseSalary > 0 ? 'Edit' : 'Set'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light transform transition-all scale-100">
            <h2 className="text-xl font-bold text-text-main mb-4">
              {editingEmployee.baseSalary > 0 ? 'Edit' : 'Set'} Base Salary
            </h2>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                {editingEmployee.avatar ? (
                  <img
                    src={editingEmployee.avatar}
                    alt={editingEmployee.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-text-main">{editingEmployee.name}</div>
                  <div className="text-sm text-text-secondary">{editingEmployee.email}</div>
                  <div className="text-sm text-text-secondary">{editingEmployee.department}</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Base Salary</label>
                <input
                  type="text"
                  value={editForm.baseSalary}
                  onChange={handleBaseSalaryChange}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter base salary (e.g., 7.000.000)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Reason (Optional)</label>
                <textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Reason for this salary change..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || !editForm.baseSalary || parseFloat(parseNumber(editForm.baseSalary)) < 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseSalarySettingsPage;

