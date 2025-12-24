import React, { useEffect, useMemo, useState } from 'react';
import { Users, SquarePenIcon, Trash2Icon, X, Search, CircleUserRoundIcon, Building2, UserCheck } from 'lucide-react';
import useTeamStore from '../../stores/useTeamStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useDepartmentStore from '../../stores/useDepartmentStore';
import useUserStore from '../../stores/useUserStore';
import { isAdmin, isManager } from '../../utils/roleUtils';

const TeamManagementPage = () => {
  const { teams, getAllTeams, createTeam, updateTeam, deleteTeam, actionLoading } = useTeamStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { departments, getAllDepartments } = useDepartmentStore();
  const { user } = useUserStore();
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [memberFilter, setMemberFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  useEffect(() => {
    getAllTeams();
    getAllUsers();
    getAllDepartments();
  }, [getAllTeams, getAllUsers, getAllDepartments]);

  const memberCount = (team) => {
    const name = team?.name;
    if (!name) return 0;
    return (employees || []).filter((emp) => {
      if (emp?.teamNames && Array.isArray(emp.teamNames)) return emp.teamNames.includes(name);
      if (emp?.teamName && typeof emp.teamName === 'string') return emp.teamName === name;
      return false;
    }).length;
  };

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    let teamsToFilter = teams || [];
    
    // Manager can only see teams in their department (backend already filters, but ensure here too)
    if (isManager(user) && !isAdmin(user)) {
      const userDepartment = user?.department || '';
      teamsToFilter = teamsToFilter.filter((team) => {
        return (team?.department || '').toLowerCase() === userDepartment.toLowerCase();
      });
    }
    
    return teamsToFilter.filter((team) => {
      const matchDept = departmentFilter === 'All' || (team?.department || '').toLowerCase() === departmentFilter.toLowerCase();
      const matchSearch = !term || (team?.name || '').toLowerCase().includes(term) || (team?.description || '').toLowerCase().includes(term);
      const memberTotal = memberCount(team);
      if (memberFilter === 'none' && memberTotal !== 0) return false;
      if (memberFilter === '1-5' && (memberTotal < 1 || memberTotal > 5)) return false;
      if (memberFilter === '6-10' && (memberTotal < 6 || memberTotal > 10)) return false;
      if (memberFilter === 'gt10' && memberTotal <= 10) return false;
      return matchDept && matchSearch;
    });
  }, [teams, search, departmentFilter, user, memberFilter]);

  const totalMembers = useMemo(() => (teams || []).reduce((sum, t) => sum + memberCount(t), 0), [teams, employees]);

  const departmentOptions = useMemo(() => {
    if (isManager(user) && !isAdmin(user)) {
      // Manager can only see their own department
      const userDepartment = user?.department || '';
      return userDepartment ? [userDepartment] : [];
    }
    // Admin can see all departments
    const names = (departments || []).map((d) => d.name).filter(Boolean);
    return ['All', ...Array.from(new Set(names))];
  }, [departments, user]);

  const avgMembers = teams && teams.length ? Math.round(totalMembers / teams.length) : 0;

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-main">Team Management</h1>
          <p className="text-sm text-text-secondary">{filteredTeams.length} teams {isManager(user) && !isAdmin(user) ? `in ${user?.department || 'your department'}` : ''}</p>
        </div>
        {(isAdmin(user) || isManager(user)) && (
          <button
            onClick={() => {
              setEditing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
          >
            + Create Team
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard 
          title="Total Teams" 
          value={teams?.length || 0} 
          subtitle={`${teams?.length || 0} ${(teams?.length || 0) === 1 ? 'team' : 'teams'}`}
          icon={Users}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Total Members" 
          value={totalMembers} 
          subtitle="Workspace members"
          icon={UserCheck}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Departments" 
          value={Math.max(departmentOptions.length - 1, 0)} 
          subtitle={`${Math.max(departmentOptions.length - 1, 0)} ${Math.max(departmentOptions.length - 1, 0) === 1 ? 'department' : 'departments'}`}
          icon={Building2}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard 
          title="Avg Members/Team" 
          value={avgMembers} 
          subtitle="Average per team"
          icon={Users}
          iconColor="bg-primary-100 text-primary-600"
        />
      </div>

      <div className="bg-white border border-border-light rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-bg-secondary px-10 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-full md:w-48 rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Team Sizes</option>
              <option value="none">No Members</option>
              <option value="1-5">1-5</option>
              <option value="6-10">6-10</option>
              <option value="gt10">&gt;10</option>
            </select>
            {isAdmin(user) && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full md:w-48 rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {departmentOptions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
            {isManager(user) && !isAdmin(user) && (
              <div className="w-full md:w-48 rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm text-text-main">
                {user?.department || 'No department'}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-bg-secondary">
              <tr className="text-xs uppercase text-text-secondary">
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Members</th>
                {(isAdmin(user) || isManager(user)) && (
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={(isAdmin(user) || isManager(user)) ? 5 : 4} className="text-center py-8 text-text-secondary">
                    No teams found.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team, idx) => {
                  const members = getTeamMembers(team, employees);
                  const actionsVisible = isAdmin(user) || isManager(user);
                  const canModify = isAdmin(user) || (isManager(user) && team.department === user?.department);
                  const isExpanded = expandedTeamId === (team._id || team.id);
                  return (
                    <React.Fragment key={team.id || team._id || idx}>
                      <tr
                        className="hover:bg-bg-secondary cursor-pointer"
                        onClick={() =>
                          setExpandedTeamId(isExpanded ? null : (team._id || team.id))
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-bg-hover text-text-secondary flex items-center justify-center">
                              <Users className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-main truncate">{team.name || 'Team'}</p>
                              <p className="text-xs text-text-secondary truncate">{team.description || 'Team description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {team.department ? (
                            <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
                              {team.department}
                            </span>
                          ) : (
                            <span className="text-sm text-text-muted">No department</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-main font-semibold">{members.length}</td>
                        {actionsVisible && (
                          <td className="px-4 py-3 text-text-main">
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                              {canModify && (
                                <>
                                  <button
                                    className="text-text-secondary hover:text-primary"
                                    title="Edit"
                                    onClick={() => {
                                      setEditing(team);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <SquarePenIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="text-text-muted hover:text-red-500"
                                    title="Delete"
                                    onClick={async () => {
                                      await deleteTeam(team._id || team.id);
                                      await getAllTeams();
                                    }}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-bg-secondary">
                          <td colSpan={actionsVisible ? 5 : 4} className="px-6 py-4">
                            <p className="font-semibold text-sm text-text-main mb-2">
                              Members ({members.length})
                            </p>
                            {members.length === 0 ? (
                              <p className="text-xs text-text-secondary">No members in this team.</p>
                            ) : (
                              <div className="flex flex-wrap gap-3">
                                {members.map((emp) => (
                                  <div
                                    key={emp.id || emp._id}
                                    className="flex items-center gap-2 rounded-full border border-border-light px-3 py-1.5 bg-white"
                                  >
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

      <CreateTeamModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (payload) => {
          if (editing) {
            await updateTeam({ id: editing._id || editing.id, ...payload });
          } else {
            await createTeam(payload);
          }
          await Promise.all([getAllTeams(), getAllUsers(), getAllDepartments()]);
        }}
        departments={departmentOptions.filter((d) => d !== 'All')}
        loading={actionLoading}
        initial={editing}
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

const getTeamMembers = (team, employees) => {
  const name = team?.name;
  return (employees || []).filter((emp) => {
    if (!name) return false;
    if (Array.isArray(emp?.teamNames) && emp.teamNames.includes(name)) return true;
    if (emp?.teamName && emp.teamName === name) return true;
    return false;
  });
};

const CreateTeamModal = ({ open, onClose, onCreate, departments, loading, initial, currentUser }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open && initial) {
      setName(initial.name || '');
      setDepartment(initial.department || '');
      setDescription(initial.description || '');
    } else if (!open) {
      setName('');
      // Set default department for manager
      if (isManager(currentUser) && !isAdmin(currentUser)) {
        setDepartment(currentUser?.department || '');
      } else {
        setDepartment('');
      }
      setDescription('');
    } else if (open && !initial && isManager(currentUser) && !isAdmin(currentUser)) {
      // When creating new team, set manager's department as default
      setDepartment(currentUser?.department || '');
    }
  }, [open, initial, currentUser]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !department) return;
    await onCreate({
      name: name.trim(),
      department,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div>
            <h3 className="text-lg font-semibold text-text-main">{initial ? 'Edit Team' : 'Create New Team'}</h3>
            <p className="text-sm text-text-secondary">Create a new team in your organization</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-border-light flex items-center gap-2 text-sm font-semibold text-text-main">
          <span className="h-8 w-8 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
            <Users className="h-4 w-4" />
          </span>
          Team Information
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Team Name <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Department <span className="text-red-500">*</span></label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isManager(currentUser) && !isAdmin(currentUser)}
              className={`w-full rounded-lg border border-border-light px-3 py-2.5 text-sm text-text-main focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary ${
                isManager(currentUser) && !isAdmin(currentUser) 
                  ? 'bg-bg-hover cursor-not-allowed' 
                  : 'bg-white'
              }`}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {isManager(currentUser) && !isAdmin(currentUser) && (
              <p className="text-xs text-text-secondary">You can only create teams in your own department</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-main">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter team description and responsibilities..."
              className="w-full rounded-lg border border-border-light bg-bg-secondary px-3 py-2.5 text-sm min-h-[110px] resize-none focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-light">
          <button onClick={onClose} className="rounded-lg border border-border-light px-4 py-2.5 text-sm font-semibold text-text-main hover:bg-bg-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-black text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {loading ? 'Saving...' : initial ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementPage;
