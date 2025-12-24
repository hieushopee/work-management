import { useEffect, useState, useMemo } from 'react';
import { UserCog, Search, Plus, RefreshCw, Eye, EyeOff, Building2, User, Shield, Edit2, Trash2, Lock, Unlock, CircleUserRoundIcon } from 'lucide-react';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin } from '../../utils/roleUtils';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';

const AccountManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { employees, getAllUsers, updateEmployee, resetEmployeePassword, toggleEmployeeLock, deleteEmployee, loading, actionLoading } = useEmployeeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showLockModal, setShowLockModal] = useState(null);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [editForm, setEditForm] = useState({
    employeeId: '',
    email: '',
    password: '',
    confirmPassword: '',
    hasPassword: false, // Track if employee already has password
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Get employees without accounts (no password set)
  const employeesWithoutAccounts = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return employees.filter((emp) => {
      // Skip admin users
      if (emp.role === 'admin') return false;
      // Only show employees without password
      return !emp.password;
    });
  }, [employees]);

  useEffect(() => {
    if (!isAdmin(user)) return;
    getAllUsers();
  }, [user]);

  // Filter employees (exclude admin, exclude locked accounts)
  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    const term = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesTerm = !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term);
      const matchesDept = departmentFilter === 'all' || (emp.department || '').toLowerCase() === departmentFilter;
      return matchesTerm && matchesDept;
    });
  }, [employees, searchQuery, departmentFilter]);

  const departmentOptions = useMemo(() => {
    const set = new Set();
    filteredEmployees.forEach((emp) => {
      if (emp.department) {
        set.add(emp.department);
      }
    });
    return ['all', ...Array.from(set)];
  }, [filteredEmployees]);

  // Ensure admin shows first
  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      const aIsAdmin = a.role === 'admin';
      const bIsAdmin = b.role === 'admin';
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [filteredEmployees]);

  const handleEmployeeSelect = (employeeId) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      setCreateForm({
        ...createForm,
        employeeId: employeeId,
        email: selectedEmployee.email || '',
      });
    }
  };

  const handleCreateAccount = async () => {
    if (!createForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    if (!createForm.email || !createForm.password) {
      toast.error('Email and password are required');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordValidation = {
      minLength: createForm.password.length >= 8,
      hasLowercase: /[a-z]/.test(createForm.password),
      hasUppercase: /[A-Z]/.test(createForm.password),
      hasNumber: /[0-9]/.test(createForm.password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(createForm.password),
    };

    if (!Object.values(passwordValidation).every(v => v)) {
      toast.error('Password must meet all requirements');
      return;
    }

    try {
      const selectedEmployee = employees.find(emp => emp.id === createForm.employeeId);
      if (!selectedEmployee) {
        toast.error('Selected employee not found');
        return;
      }

      // Update employee with password and email
      const { updateEmployee } = useEmployeeStore.getState();
      await updateEmployee({
        id: createForm.employeeId,
        name: selectedEmployee.name,
        email: createForm.email,
        phoneNumber: selectedEmployee.phoneNumber || '',
        department: selectedEmployee.department || '',
        role: selectedEmployee.role || 'staff',
        password: createForm.password,
      });
      
      setShowCreateModal(false);
      setCreateForm({
        employeeId: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      getAllUsers();
      toast.success('Account created successfully');
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(error.response?.data?.error || 'Failed to create account');
    }
  };

  const handleResetPassword = async (employeeId) => {
    try {
      const result = await resetEmployeePassword(employeeId);
      if (result?.success) {
        setShowResetModal(null);
        getAllUsers();
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const handleDelete = async (employeeId) => {
    try {
      await deleteEmployee(employeeId);
      setShowDeleteModal(null);
      getAllUsers();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleToggleLock = async (lockData) => {
    try {
      if (!lockData?.id) return;
      const result = await toggleEmployeeLock(lockData.id);
      if (result?.success) {
        setShowLockModal(null);
        getAllUsers();
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const handleEdit = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      const hasPassword = !!employee.password;
      setEditForm({
        employeeId: employee.id,
        email: employee.email || '',
        password: '',
        confirmPassword: '',
        hasPassword, // Track if employee already has password
      });
      setShowEditModal(employeeId);
    }
  };

  const handleEmployeeSelectForEdit = (employeeId) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      const hasPassword = !!selectedEmployee.password;
      setEditForm({
        employeeId: employeeId,
        email: selectedEmployee.email || '',
        password: '',
        confirmPassword: '',
        hasPassword,
      });
    }
  };

  const handleUpdateAccount = async () => {
    if (!editForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    if (!editForm.email) {
      toast.error('Email is required');
      return;
    }

    // If employee doesn't have password, password is required
    if (!editForm.hasPassword && !editForm.password) {
      toast.error('Please provide a password for this account');
      return;
    }

    // If password is provided (required for new accounts or optional for existing), validate it
    if (editForm.password) {
      if (editForm.password !== editForm.confirmPassword) {
        toast.error('Confirmation password does not match');
        return;
      }

      // Validate password strength
      const passwordValidation = {
        minLength: editForm.password.length >= 8,
        hasLowercase: /[a-z]/.test(editForm.password),
        hasUppercase: /[A-Z]/.test(editForm.password),
        hasNumber: /[0-9]/.test(editForm.password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(editForm.password),
      };

      if (!Object.values(passwordValidation).every(v => v)) {
        toast.error('Password must meet all requirements');
        return;
      }
    }

    try {
      const selectedEmployee = employees.find(emp => emp.id === editForm.employeeId);
      if (!selectedEmployee) {
        toast.error('Employee not found');
        return;
      }

      // Update employee with email and optionally password
      const updateData = {
        id: editForm.employeeId,
        name: selectedEmployee.name,
        email: editForm.email,
        phoneNumber: selectedEmployee.phoneNumber || '',
        department: selectedEmployee.department || '',
        role: selectedEmployee.role || 'staff',
      };

      // Only include password if it's provided
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await updateEmployee(updateData);
      
      const wasCreatingPassword = !editForm.hasPassword;
      setShowEditModal(null);
      setEditForm({
        employeeId: '',
        email: '',
        password: '',
        confirmPassword: '',
        hasPassword: false,
      });
      getAllUsers();
      toast.success(wasCreatingPassword ? 'Password created successfully' : 'Account updated successfully');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error(error.response?.data?.error || 'Unable to update account');
    }
  };

  if (!isAdmin(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading && !employees) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            Account Management
          </h1>
          <p className="text-text-secondary mt-1">Create and manage employee accounts with passwords</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Password Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-text-secondary">
                    No employees found
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((employee) => (
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
                            <CircleUserRoundIcon className="w-10 h-10 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-text-main">{employee.name || 'N/A'}</div>
                          <div className="text-sm text-text-secondary flex items-center gap-2">
                            <span>{employee.email || ''}</span>
                            {employee.isLocked && (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700">
                                Locked
                              </span>
                            )}
                          </div>
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
                        {employee.password ? (
                          <>
                            <Shield className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-text-main">
                              {employee.passwordChangedAt ? 'Changed' : 'Default'}
                            </span>
                            {employee.passwordChangedAt && (
                              <span className="text-xs text-text-secondary">
                                ({formatDate(employee.passwordChangedAt)})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 text-text-muted" />
                            <span className="text-sm text-text-secondary">Not set</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(employee.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary-hover hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {employee.password && (
                          <button
                            onClick={() => setShowResetModal(employee.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowLockModal({ id: employee.id, isLocked: employee.isLocked })}
                          disabled={employee.role === 'admin'}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            employee.role === 'admin'
                              ? 'text-text-muted cursor-not-allowed'
                              : employee.isLocked
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          }`}
                          title={
                            employee.role === 'admin'
                              ? 'Cannot lock admin account'
                              : employee.isLocked
                              ? 'Unlock Account'
                              : 'Lock Account'
                          }
                        >
                          {employee.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(employee.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light">
            <h2 className="text-xl font-bold text-text-main mb-4">Create Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employeesWithoutAccounts.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || 'N/A'} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
                {employeesWithoutAccounts.length === 0 && (
                  <p className="text-xs text-text-secondary mt-1">
                    All employees already have accounts. Create new employee in Employee Profiles first.
                  </p>
                )}
              </div>
              
              {createForm.employeeId && (
                <>
                  <div className="bg-bg-secondary border border-border-light rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">Employee Information:</p>
                    {(() => {
                      const selectedEmp = employees.find(e => e.id === createForm.employeeId);
                      return selectedEmp ? (
                        <div className="text-sm text-text-main">
                          <p><strong>Name:</strong> {selectedEmp.name || 'N/A'}</p>
                          <p><strong>Department:</strong> {selectedEmp.department || 'N/A'}</p>
                          <p><strong>Role:</strong> {selectedEmp.role || 'N/A'}</p>
                          {selectedEmp.phoneNumber && (
                            <p><strong>Phone:</strong> {selectedEmp.phoneNumber}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Email (Account) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="employee@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-xs text-blue-800 font-medium mb-1">Password Requirements:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5">
                        <li>• At least 8 characters</li>
                        <li>• At least 1 lowercase letter (a-z)</li>
                        <li>• At least 1 uppercase letter (A-Z)</li>
                        <li>• At least 1 number (0-9)</li>
                        <li>• At least 1 special character (!@#$%^&*)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Confirm password"
                      required
                    />
                    {createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                    {createForm.confirmPassword && createForm.password === createForm.confirmPassword && (
                      <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({
                    employeeId: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                  });
                }}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={actionLoading || !createForm.employeeId || !createForm.email || !createForm.password || createForm.password !== createForm.confirmPassword}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light">
            <h2 className="text-xl font-bold text-text-main mb-4">Reset Password</h2>
            <p className="text-text-secondary mb-6">
              Are you sure you want to reset this employee's password to default? A new default password will be sent to their email.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetPassword(showResetModal)}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light">
            <h2 className="text-xl font-bold text-text-main mb-4">Delete Account</h2>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete this employee account? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-text-main mb-4">
              {editForm.hasPassword ? 'Edit Account' : 'Set Account Password'}
            </h2>
            <div className="space-y-4">
              {editForm.employeeId && (
                <>
                  <div className="bg-bg-secondary border border-border-light rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-2">Employee details:</p>
                    {(() => {
                      const selectedEmp = employees.find(e => e.id === editForm.employeeId);
                      return selectedEmp ? (
                        <div className="text-sm text-text-main">
                          <p><strong>Name:</strong> {selectedEmp.name || 'N/A'}</p>
                          <p><strong>Role:</strong> {selectedEmp.role || 'N/A'}</p>
                          <p><strong>Department:</strong> {selectedEmp.department || 'N/A'}</p>
                          <p className="flex items-center gap-2 mt-1">
                            <strong className="text-sm font-semibold text-text-main">Status:</strong>
                            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                              selectedEmp.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {selectedEmp.isLocked ? 'Locked' : 'Active'}
                            </span>
                          </p>
                          {selectedEmp.phoneNumber && (
                            <p className="mt-1"><strong>Phone:</strong> {selectedEmp.phoneNumber}</p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Account Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="employee@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      {editForm.hasPassword ? (
                        <>New password <span className="text-text-secondary text-xs">(leave blank to keep current)</span></>
                      ) : (
                        <>Password <span className="text-red-500">*</span></>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                        placeholder={editForm.hasPassword ? "Enter new password (optional)" : "Enter password"}
                        required={!editForm.hasPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {(editForm.password || !editForm.hasPassword) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                        <p className="text-xs text-blue-800 font-medium mb-1">Password requirements:</p>
                        <ul className="text-xs text-blue-700 space-y-0.5">
                          <li>• At least 8 characters</li>
                          <li>• At least 1 lowercase letter (a-z)</li>
                          <li>• At least 1 uppercase letter (A-Z)</li>
                          <li>• At least 1 number (0-9)</li>
                          <li>• At least 1 special character (!@#$%^&*)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {(editForm.password || !editForm.hasPassword) && (
                    <div>
                      <label className="block text-sm font-medium text-text-main mb-2">
                        Confirm password {!editForm.hasPassword && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Re-enter password"
                        required={!editForm.hasPassword}
                      />
                      {editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                        <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                      )}
                      {editForm.confirmPassword && editForm.password === editForm.confirmPassword && (
                        <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(null);
                  setEditForm({
                    employeeId: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                  });
                }}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAccount}
                disabled={
                  actionLoading || 
                  !editForm.employeeId || 
                  !editForm.email || 
                  (!editForm.hasPassword && !editForm.password) ||
                  (editForm.password && editForm.password !== editForm.confirmPassword)
                }
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Updating...' : editForm.hasPassword ? 'Update' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Account Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-text-main/20 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border-light">
            <h2 className="text-xl font-bold text-text-main mb-4">
              {showLockModal?.isLocked ? 'Unlock Account' : 'Lock Account'}
            </h2>
            <p className="text-text-secondary mb-6">
              {showLockModal?.isLocked
                ? 'This account is currently locked. Unlock to allow the employee to sign in again.'
                : 'Locking will disable sign-in for this employee until you unlock it.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLockModal(null)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleLock(showLockModal)}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  showLockModal?.isLocked
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : showLockModal?.isLocked
                  ? 'Unlock Account'
                  : 'Lock Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagementPage;
