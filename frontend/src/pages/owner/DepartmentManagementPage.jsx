import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Users, X, SquarePenIcon, Trash2Icon, Search, CircleUserRoundIcon, FolderOpen, UserCheck } from 'lucide-react';
import useDepartmentStore from '../../stores/useDepartmentStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import useUserStore from '../../stores/useUserStore';
import { isAdmin, isManager } from '../../utils/roleUtils';

const DepartmentManagementPage = () => {
  const { departments, getAllDepartments, createDepartment, updateDepartment, deleteDepartment, actionLoading, loading } = useDepartmentStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { teams, getAllTeams } = useTeamStore();
  const { user } = useUserStore();
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedDeptId, setExpandedDeptId] = useState(null);
  const [managerFilter, setManagerFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

  useEffect(() => {
    getAllDepartments();
    getAllUsers();
    getAllTeams();
  }, [getAllDepartments, getAllUsers, getAllTeams]);

  const departmentStats = useMemo(() => {
    const counts = new Map();
    (employees || []).forEach((emp) => {
      if (!emp?.department) return;
      counts.set(emp.department, (counts.get(emp.department) || 0) + 1);
    });
    return counts;
  }, [employees]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (departments || []).filter((d) => {
      if (!term) return true;
      return (d.name || '').toLowerCase().includes(term) || (d.description || '').toLowerCase().includes(term);
    });
  }, [departments, query]);

  const totalEmployees = Array.from(departmentStats.values()).reduce((sum, v) => sum + v, 0);
  const avgEmployees = filtered.length ? Math.round(totalEmployees / filtered.length) : 0;
  const isAdminUser = isAdmin(user);
  const showActions = isAdminUser;

  const teamCountsByDept = useMemo(() => {
    const counts = new Map();
    (teams || []).forEach((team) => {
      const deptName = (team.department || '').trim().toLowerCase();
      if (!deptName) return;
      counts.set(deptName, (counts.get(deptName) || 0) + 1);
    });
    return counts;
  }, [teams]);

  const managerOptions = useMemo(() => {
    const names = new Set();
    (departments || []).forEach((dept) => {
      if (dept?.manager?.name) {
        names.add(dept.manager.name);
      }
    });
    return Array.from(names);
  }, [departments]);

  const filteredWithFilters = useMemo(() => {
    return filtered.filter((dept) => {
      const teamCount = teamCountsByDept.get((dept.name || '').toLowerCase()) || 0;
      const managerName = dept.manager?.name || '';

      if (managerFilter === 'none' && dept.manager) return false;
      if (managerFilter !== 'all' && managerFilter !== 'none' && managerName !== managerFilter) return false;

      if (teamFilter === 'none' && teamCount !== 0) return false;
      if (teamFilter === '1-5' && (teamCount < 1 || teamCount > 5)) return false;
      if (teamFilter === '6-10' && (teamCount < 6 || teamCount > 10)) return false;
      if (teamFilter === 'gt10' && teamCount <= 10) return false;

      return true;
    });
  }, [filtered, managerFilter, teamFilter, teamCountsByDept]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-main">Department Management</h1>
          <p className="text-sm text-text-secondary">Manage departments in your organization ({filtered.length} departments)</p>
        </div>
        {isAdmin(user) && (
          <button
            onClick={() => { setEditing(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
          >
            + Create Department
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard 
          title="Total Departments" 
          value={filtered.length} 
          subtitle={`${filtered.length} ${filtered.length === 1 ? 'department' : 'departments'}`}
          icon={Building2}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Total Employees" 
          value={totalEmployees} 
          subtitle="Workspace members"
          icon={Users}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Total Teams" 
          value={teamCountsByDept.size || 0} 
          subtitle={`${teamCountsByDept.size || 0} ${teamCountsByDept.size === 1 ? 'team' : 'teams'}`}
          icon={FolderOpen}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard 
          title="Avg Employees/Dept" 
          value={avgEmployees} 
          subtitle="Average per department"
          icon={UserCheck}
          iconColor="bg-primary-100 text-primary-600"
        />
      </div>

      <div className="bg-white border border-border-light rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by department or description..."
                className="w-full rounded-lg border border-border-light bg-bg-secondary pl-10 pr-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-full md:w-48 rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Managers</option>
              <option value="none">No Manager</option>
              {managerOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full md:w-48 rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Team States</option>
              <option value="none">No Team</option>
              <option value="1-5">1-5</option>
              <option value="6-10">6-10</option>
              <option value="gt10">&gt;10</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-bg-secondary">
              <tr className="text-xs uppercase text-text-secondary">
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Manager</th>
                <th className="px-4 py-3 text-left font-semibold">Teams</th>
                <th className="px-4 py-3 text-left font-semibold">Employees</th>
                {showActions && <th className="px-4 py-3 text-left font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWithFilters.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="text-center py-8 text-text-secondary">
                    {loading ? 'Loading departments...' : 'No departments found.'}
                  </td>
                </tr>
              ) : (
                filteredWithFilters.map((dept, idx) => {
                  const count = departmentStats.get(dept.name) || 0;
                  const members = getDeptMembers(dept, employees);
                  return (
                    <React.Fragment key={dept._id || dept.id || idx}>
                      <tr className="hover:bg-bg-secondary cursor-pointer" onClick={() => setExpandedDeptId(expandedDeptId === (dept._id || dept.id) ? null : (dept._id || dept.id))}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 flex-shrink-0 rounded-lg text-white flex items-center justify-center ${dept.color || 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-main truncate">{dept.name}</p>
                              <p className="text-xs text-text-secondary truncate">{dept.description || 'Department description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-main">{dept.manager?.name || 'No manager'}</td>
                        <td className="px-4 py-3 text-text-main font-semibold">
                          {teamCountsByDept.get((dept.name || '').toLowerCase()) || 0}
                        </td>
                        <td className="px-4 py-3 text-text-main font-semibold">
                          <span className="text-primary font-semibold">{count}</span>
                        </td>
                        {showActions && (
                          <td className="px-4 py-3 text-text-main">
                            <div className="flex items-center gap-3">
                              <button
                                className="text-text-secondary hover:text-primary"
                                title="Edit"
                                onClick={(e) => { e.stopPropagation(); setEditing(dept); setIsModalOpen(true); }}
                              >
                                <SquarePenIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="text-text-muted hover:text-red-500"
                                title="Delete"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await deleteDepartment(dept._id || dept.id);
                                  await getAllDepartments();
                                }}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedDeptId === (dept._id || dept.id) && (
                        <tr className="bg-bg-secondary">
                          <td colSpan={showActions ? 5 : 4} className="px-6 py-4">
                            <p className="font-semibold text-sm text-text-main mb-2">
                              Members ({members.length})
                            </p>
                            {members.length === 0 ? (
                              <p className="text-xs text-text-secondary">No members in this department.</p>
                            ) : (
                              <div className="flex flex-wrap gap-3">
                                {members.map((emp) => (
                                  <div key={emp.id || emp._id} className="flex items-center gap-2 rounded-full border border-border-light px-3 py-1.5 bg-white">
                                    {emp.avatar ? (
                                      <img
                                        src={emp.avatar}
                                        alt={emp.name}
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center">
                                        <CircleUserRoundIcon className="w-6 h-6 text-primary" />
                                      </div>
                                    )}
                                    <span className="text-xs font-semibold text-text-main">{emp.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DepartmentCreateModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (payload) => {
          if (editing) {
            await updateDepartment(editing._id || editing.id, payload);
          } else {
            await createDepartment(payload);
          }
          await getAllDepartments();
        }}
        employees={employees}
        initial={editing}
        loading={actionLoading}
        currentUser={user}
      />
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, iconColor }) => (
  <div className="rounded-xl p-5 bg-white border border-border-light shadow-soft flex items-center justify-between">
    <div className="flex-1">
      <p className="text-sm text-text-secondary mb-1">{title}</p>
      <p className="text-3xl font-semibold text-text-main mb-1">{value}</p>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
    {Icon && (
      <div className={`w-12 h-12 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0 ml-4`}>
        <Icon className="w-6 h-6" />
      </div>
    )}
  </div>
);

const getDeptMembers = (dept, employees) => {
  const name = (dept?.name || '').toLowerCase();
  return (employees || []).filter((emp) => (emp?.department || '').toLowerCase() === name);
};

const DepartmentCreateModal = ({ open, onClose, onCreate, employees, initial, loading, currentUser }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [manager, setManager] = useState('');
  const isAdminUser = isAdmin(currentUser);

  // Filter employees to only show those in the current department
  // Must be before any conditional returns to follow Rules of Hooks
  const availableManagers = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    // When editing, use the department name (either from initial or current name input)
    const departmentName = (initial?.name || name || '').trim();

    if (!departmentName) {
      // If no department name yet (creating new), show all employees
      return employees;
    }

    // Filter employees by department name (case-insensitive)
    return employees.filter((emp) => {
      const empDept = (emp.department || '').trim();
      return empDept.toLowerCase() === departmentName.toLowerCase();
    });
  }, [employees, initial?.name, name]);

  useEffect(() => {
    if (open && initial) {
      setName(initial.name || '');
      setDescription(initial.description || '');
      setColor(initial.color || 'bg-blue-500');
      // Prefer manager id from populated object, then fallback id string
      setManager(initial.manager?._id || initial.manager?.id || initial.manager || '');
    } else if (!open) {
      setName('');
      setDescription('');
      setColor('bg-blue-500');
      setManager('');
    }
  }, [open, initial]);

  if (!open) return null;

  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-red-500', 'bg-violet-500', 'bg-emerald-500', 'bg-sky-500'];

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), description: description.trim(), color, manager });
    onClose();
  };

  const resolvedManagerName =
    initial?.manager?.name ||
    availableManagers.find((emp) => (emp.id || emp._id) === manager)?.name ||
    '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div>
            <h3 className="text-lg font-semibold text-text-main">{initial ? 'Edit Department' : 'Create New Department'}</h3>
            <p className="text-sm text-text-secondary">Create a new department in your organization</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-border-light flex items-center gap-2 text-sm font-semibold text-text-main">
          <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="h-4 w-4" />
          </span>
          Department Information
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Department Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Success"
              disabled={initial && isManager(currentUser) && !isAdmin(currentUser)}
              className={`w-full rounded-lg border border-border-light px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary ${
                initial && isManager(currentUser) && !isAdmin(currentUser) 
                  ? 'bg-bg-hover text-text-secondary cursor-not-allowed' 
                  : 'bg-bg-secondary'
              }`}
            />
            {initial && isManager(currentUser) && !isAdmin(currentUser) && (
              <p className="text-xs text-text-secondary">You cannot change the department name</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the department"
              className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Department Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-md border ${color === c ? 'ring-2 ring-indigo-400 border-white' : 'border-transparent'} ${c}`}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-main">Assign Manager (Optional)</label>
              {isAdminUser ? (
                <>
                  <select
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!name.trim() && !initial}
                  >
                    <option value="">
                      {!name.trim() && !initial
                        ? 'Enter department name first'
                        : availableManagers.length === 0
                        ? 'No employees in this department'
                        : 'Select manager'}
                    </option>
                    {availableManagers.map((emp) => (
                      <option key={emp.id || emp._id} value={emp.id || emp._id}>
                        {emp.name} {emp.email ? `(${emp.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {name.trim() && availableManagers.length === 0 && (
                    <p className="text-xs text-text-secondary">No employees found in this department</p>
                  )}
                </>
              ) : (
                <div className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm text-text-main">
                  {resolvedManagerName || 'No manager assigned'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-light">
          <button onClick={onClose} className="rounded-lg border border-border-light px-4 py-2.5 text-sm font-semibold text-text-main hover:bg-bg-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {loading ? 'Saving...' : initial ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagementPage;
