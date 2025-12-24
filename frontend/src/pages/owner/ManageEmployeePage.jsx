import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, SquarePenIcon, Trash2Icon, CircleUserRoundIcon } from 'lucide-react';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import useUserStore from '../../stores/useUserStore';
import EmployeeForm from '../../components/EmployeeForm';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin, isManager, canManageUser } from '../../utils/roleUtils';

const colorPool = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-primary', 'bg-emerald-500'];

// Avatar component with fallback
const Avatar = ({ employee, index }) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = employee?.avatar; // Use avatar field like in Header
  
  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={employee?.name || 'Employee'}
        className="h-10 w-10 rounded-full object-cover border-2 border-white"
        onError={() => setImageError(true)}
      />
    );
  }
  
  // Default avatar with icon (like in Header and Account Management)
  return (
    <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
      <CircleUserRoundIcon className="h-10 w-10 text-primary" />
    </div>
  );
};

const ManageEmployeePage = () => {
  const { employees, getAllUsers, createEmployee, updateEmployee, deleteEmployee, loading, actionLoading } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const { user, logout, checkAuth } = useUserStore();

  const [isOpen, setIsOpen] = useState({ type: 'create', open: false });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    getAllUsers();
    getAllTeams();
  }, [getAllUsers, getAllTeams]);

  // Filter employees based on user role
  const visibleEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    let filtered = employees;
    
    // Manager can only see employees in their department
    if (isManager(user) && !isAdmin(user)) {
      const userDepartment = user?.department || '';
      filtered = employees.filter((emp) => {
        const empDepartment = emp?.department || '';
        return empDepartment === userDepartment;
      });
    }
    // Admin can see all employees
    
    return filtered.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }, [employees, user]);

  const departmentOptions = useMemo(() => {
    const set = new Set();
    (visibleEmployees || []).forEach((emp) => emp?.department && set.add(emp.department));
    return ['all', ...Array.from(set)];
  }, [visibleEmployees]);

  const filteredEmployees = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return (visibleEmployees || []).filter((emp) => {
      if (!emp) return false;
      const matchesTerm = !term ||
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term) ||
        (emp.department || '').toLowerCase().includes(term) ||
        (emp.phoneNumber || '').toLowerCase().includes(term);
      const matchesDept = departmentFilter === 'all' || (emp.department || '').toLowerCase() === departmentFilter;
      const matchesRole = roleFilter === 'all' || (emp.role || '').toLowerCase() === roleFilter;
      return matchesTerm && matchesDept && matchesRole;
    });
  }, [visibleEmployees, searchQuery, departmentFilter, roleFilter]);

  const onCreateEmployeeClick = () => {
    setSelectedEmployee(null);
    setIsOpen({ type: 'create', open: true });
  };

  const onEditClick = (employee) => {
    setSelectedEmployee(employee);
    setIsOpen({ type: 'edit', open: true });
  };

  const onDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setIsOpen({ type: 'delete', open: true });
  };

  const onEmployeeFormSubmit = async (employee) => {
    if (isOpen.type === 'create') await createEmployee(employee);
    if (isOpen.type === 'edit') {
      await updateEmployee({ id: selectedEmployee.id, ...employee });
      if (user.id === selectedEmployee.id) checkAuth();
    }
    await Promise.all([getAllUsers(), getAllTeams()]);
    setIsOpen({ type: 'create', open: false });
  };

  const onDeleteEmployeeConfirm = async () => {
    if (isOpen.type !== 'delete') return;
    await deleteEmployee(selectedEmployee.id);
    await Promise.all([getAllUsers(), getAllTeams()]);
    setIsOpen({ type: 'create', open: false });
    if (selectedEmployee.id === user.id) logout();
  };


  const roleBadge = (emp) => {
    const role = emp.role || 'staff';
    const roleClasses = {
      admin: 'bg-red-50 text-red-700 hover:bg-red-100',
      manager: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      staff: 'bg-green-50 text-green-700 hover:bg-green-100',
    };
    const roleLabels = {
      admin: 'Admin',
      manager: 'Manager',
      staff: 'Staff',
    };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${roleClasses[role] || roleClasses.staff}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const teamLabel = (emp) => {
    if (emp?.teamNames && emp.teamNames.length) return emp.teamNames[0];
    if (emp?.teamName) return emp.teamName;
    return 'No Team';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-main mb-1">Employee Management</h1>
          <p className="text-sm text-text-secondary">Manage employee information and profiles ({filteredEmployees.length} employees)</p>
        </div>
        {(isAdmin(user) || isManager(user)) && (
          <button
            onClick={onCreateEmployeeClick}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-text-main transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border-light p-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-border-light pl-10 pr-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-[180px] rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept.toLowerCase()}>{dept === 'all' ? 'All Departments' : dept}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-[180px] rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Employee</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Phone Number</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Department</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Team</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-text-secondary">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id || idx} className="border-b border-border-light hover:bg-bg-secondary">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar employee={emp} index={idx} />
                        <div>
                          <div className="text-text-main">{emp.name}</div>
                          <div className="text-xs text-text-secondary">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-main text-sm">{emp.phoneNumber || '-'}</td>
                    <td className="py-3 px-4 text-text-main">{emp.department || '—'}</td>
                    <td className="py-3 px-4">
                      {teamLabel(emp) === 'No Team' ? (
                        <span className="text-sm text-text-muted">No Team</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">{teamLabel(emp)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{roleBadge(emp)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${emp.isVerified ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-text-main">{emp.isVerified ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {canManageUser(user, emp) && (
                          <>
                            <button className="p-1.5 hover:bg-bg-hover rounded transition-colors" onClick={() => onEditClick(emp)}>
                              <SquarePenIcon className="w-4 h-4 text-text-secondary" />
                            </button>
                            {isAdmin(user) && (
                              <button className="p-1.5 hover:bg-bg-hover rounded transition-colors" onClick={() => onDeleteClick(emp)}>
                                <Trash2Icon className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen.open && isOpen.type !== 'delete' && (
        <EmployeeForm
          employee={selectedEmployee}
          type={isOpen.type}
          isLoading={actionLoading}
          setIsOpen={setIsOpen}
          onSubmit={onEmployeeFormSubmit}
          currentUser={user}
          teams={teams}
          key={isOpen.type === 'create' ? 'create' : selectedEmployee?.id || 'edit'}
        />
      )}

      {isOpen.type === 'delete' && isOpen.open && (
        <DeleteConfirmation loading={actionLoading} itemName={selectedEmployee?.name} setIsOpen={setIsOpen} onDelete={onDeleteEmployeeConfirm} />
      )}
    </div>
  );
};

export default ManageEmployeePage;
