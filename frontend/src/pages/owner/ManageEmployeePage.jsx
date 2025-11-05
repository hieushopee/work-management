import React, { useEffect, useMemo, useState } from 'react'
import { SquarePenIcon, Trash2Icon, ArrowUpDown, User, Mail, Briefcase, Building, Users } from 'lucide-react';
import useEmployeeStore from '../../stores/useEmployeeStore'
import useTeamStore from '../../stores/useTeamStore'
import EmployeeForm from '../../components/EmployeeForm';
import TeamForm from '../../components/TeamForm';
import TeamSidebar from '../../components/TeamSidebar';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import LoadingSpinner from '../../components/LoadingSpinner';
import Filter from '../../components/Filter';
import useUserStore from '../../stores/useUserStore';

const ManageEmployeePage = () => {
  const { employees, getAllUsers, createEmployee, updateEmployee, deleteEmployee, loading, actionLoading } = useEmployeeStore();
  const { teams, getAllTeams, createTeam, actionLoading: teamActionLoading } = useTeamStore();
  const { user, logout, checkAuth } = useUserStore();

  const [isOpen, setIsOpen] = useState({ type: 'create', open: false });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filteredEmployees, setFilteredEmployees] = useState(employees || []);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'default' });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamSidebar] = useState(true);

  const onCreateEmployeeClick = () => {
    setSelectedEmployee(null);
    setIsOpen({ type: 'create', open: true });
  }

  const onCreateTeamClick = () => {
    setSelectedTeam(null);
    setIsOpen({ type: 'createTeam', open: true });
  }

  const onEditClick = (employee) => {
    setSelectedEmployee(employee);
    setIsOpen({ type: 'edit', open: true });
  }

  const onDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setIsOpen({ type: 'delete', open: true });
  }

  const onEmployeeFormSubmit = async (employee) => {
    if (isOpen.type === 'create') {
      await createEmployee(employee);
    }

    if (isOpen.type === 'edit') {
      await updateEmployee({ id: selectedEmployee.id, ...employee })

      if(user.id === selectedEmployee.id) {
        checkAuth();
      }
    }

    // Refresh both employees and teams data to ensure consistency
    await Promise.all([
      getAllUsers(),
      getAllTeams()
    ]);

    setIsOpen({ type: 'create', open: false });
  }

  const onTeamFormSubmit = async (team, setError) => {
    try {
      await createTeam(team);

      // Refresh employees data to show new team in dropdown
      await getAllUsers();

      setIsOpen({ type: 'create', open: false });
    } catch (error) {
      console.error('Error creating team:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create team';
      if (setError) {
        setError(errorMessage);
      } else {
        alert(`Error: ${errorMessage}`);
      }
    }
  }

  const parseDate = (value) => {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const defaultSortedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) {
      return [];
    }
    return [...employees].sort((a, b) => parseDate(b?.createdAt) - parseDate(a?.createdAt));
  }, [employees]);

  const handleTeamSelect = (team) => {
    if (team.id === 'unassigned') {
      setSelectedTeam('unassigned');
      // Filter employees without teams
      const unassignedMembers = defaultSortedEmployees?.filter(emp => {
        if (!emp) return true;
        if (emp.teamNames && Array.isArray(emp.teamNames)) {
          return !emp.teamNames || emp.teamNames.length === 0;
        }
        if (emp.teamName && typeof emp.teamName === 'string') {
          return !emp.teamName || emp.teamName.trim() === '';
        }
        return true;
      }) || [];
      setFilteredEmployees(unassignedMembers);
    } else {
      setSelectedTeam(team.id || team._id);
      // Filter employees by selected team name
      const teamMembers = defaultSortedEmployees?.filter(emp => {
        if (!emp) return false;
        if (emp.teamNames && Array.isArray(emp.teamNames)) {
          return emp.teamNames.includes(team.name);
        }
        if (emp.teamName && typeof emp.teamName === 'string') {
          return emp.teamName === team.name;
        }
        return false;
      }) || [];
      setFilteredEmployees(teamMembers);
    }
  }

  const handleShowAllEmployees = () => {
    setSelectedTeam(null);
    setFilteredEmployees(defaultSortedEmployees || []);
  }

  const onDeleteEmployeeConfirm = async () => {
    if (isOpen.type === 'delete') {
      await deleteEmployee(selectedEmployee.id);

      // Refresh both employees and teams data to ensure consistency
      await Promise.all([
        getAllUsers(),
        getAllTeams()
      ]);

      setIsOpen({ type: 'create', open: false });

      if (selectedEmployee.id === user.id) {
        logout();
      }
    }
  }

  const filterEmployee = async (query) => {
    const baseList = defaultSortedEmployees || [];

    if (query === '') {
      setFilteredEmployees(baseList);
      return;
    }

    query = await query?.trim().toLowerCase();

    const filtered = baseList.filter(employee => {
      return employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query) ||
        (employee.phoneNumber?.toLowerCase().includes(query) || '') ||
        (employee.isVerified ? 'active' : 'inactive').includes(query)
    });

    setFilteredEmployees(filtered);
  }
  
  const sortedEmployees = useMemo(() => {
    if (sortConfig.direction !== 'ascending' || sortConfig.key === 'createdAt') {
      return filteredEmployees;
    }

    const normalized = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).toLowerCase();
    };

    return [...filteredEmployees].sort((a, b) => {
      const aValue = normalized(a?.[sortConfig.key]);
      const bValue = normalized(b?.[sortConfig.key]);
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });
  }, [filteredEmployees, sortConfig]);

  const requestSort = (key) => {
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      setSortConfig({ key: 'createdAt', direction: 'default' });
      return;
    }
    setSortConfig({ key, direction: 'ascending' });
  };

  useEffect(() => {
    getAllUsers();
    getAllTeams();
  }, [getAllUsers, getAllTeams])

  useEffect(() => {
    setFilteredEmployees(defaultSortedEmployees);
  }, [defaultSortedEmployees]);

  const renderUserAvatar = (employee, size = 'w-10 h-10') => {
    if (employee?.avatar) {
      return (
        <img
          src={employee.avatar}
          alt={employee?.name || 'User avatar'}
          className={`${size} rounded-full object-cover border-2 border-white shadow-sm`}
        />
      );
    }

    const initials = (employee?.name || '')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    return (
      <div className={`${size} flex items-center justify-center rounded-full bg-blue-500 text-white font-semibold shadow-sm text-sm`}>
        {initials}
      </div>
    );
  };

  const SortableHeader = ({ label, sortKey, hideIcon }) => {
    const isActive = sortConfig.key === sortKey;
    const isAscending = isActive && sortConfig.direction === 'ascending';

    return (
      <button
        onClick={() => requestSort(sortKey)}
        className='flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-800 transition-colors'
        type='button'
      >
        <span>{label}</span>
        {!hideIcon && (
          <ArrowUpDown
            className={`w-4 h-4 transition-transform ${isActive ? (isAscending ? 'text-blue-500 rotate-0' : 'text-blue-500 rotate-180') : ''}`}
          />
        )}
      </button>
    );
  };

  if (loading) return <LoadingSpinner />

  return (
    <div className='bg-white h-full font-sans flex overflow-hidden'>
      {/* Team Sidebar */}
      {showTeamSidebar && (
        <div className="w-64 flex-shrink-0">
          <TeamSidebar
            teams={teams}
            employees={employees}
            onTeamSelect={handleTeamSelect}
            onShowAll={handleShowAllEmployees}
            onCreateTeam={onCreateTeamClick}
            onCreateEmployee={onCreateEmployeeClick}
            selectedTeam={selectedTeam}
          />
        </div>
      )}

      {/* Main Content */}
      <div className='flex-1 flex flex-col min-w-0 min-h-0'>
        <div className='flex-1 overflow-hidden'>
          <div className='max-w-7xl mx-auto h-full flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-12 w-full overflow-hidden'>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className='space-y-1'>
                <h1 className="text-3xl font-bold text-slate-800">Manage Employees</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {sortedEmployees?.length} Users
                  {selectedTeam === 'unassigned' && ' • Unassigned Members'}
                  {selectedTeam && selectedTeam !== 'unassigned' && ` • Team: ${teams?.find(t => (t.id || t._id) === selectedTeam)?.name}`}
                </p>
              </div>
              <div className="w-full sm:w-64 md:w-72 lg:w-80">
                <Filter onSearch={filterEmployee} placeholder="Search employees..." />
              </div>
            </header>

            <div className='flex-1 min-h-0'>
              <div className='bg-white shadow-xl rounded-2xl h-full flex flex-col overflow-hidden'>
                {/* Desktop Table */}
                <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
                  <div className='flex-1 overflow-y-auto'>
                    <table className='w-full text-left table-fixed'>
                      <thead className='bg-slate-100/70'>
                        <tr>
                          <th className='w-[32%] p-4 text-slate-500 font-semibold text-left'><SortableHeader label="Employee" sortKey="name" /></th>
                          <th className='w-[16%] p-4 text-slate-500 font-semibold text-left'><SortableHeader label="Department" sortKey="department" /></th>
                          <th className='w-[18%] p-4 text-slate-500 font-semibold'>Team</th>
                          <th className='w-[14%] p-4 text-slate-500 font-semibold text-left'><SortableHeader label="Role" sortKey="role" hideIcon /></th>
                          <th className='w-[12%] p-4 text-slate-500 font-semibold text-left'>Status</th>
                          <th className='w-[8%] p-4 text-slate-500 font-semibold text-left'>Actions</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-slate-100'>
                        {
                          !loading && sortedEmployees?.length > 0 ? sortedEmployees.map((employee) => (
                            <tr key={employee.id} className='hover:bg-slate-50 transition-colors'>
                              <td className='p-4 flex items-center gap-3 min-w-0'>
                                {renderUserAvatar(employee)}
                                <div className='min-w-0'>
                                  <p className='font-semibold text-slate-800 truncate max-w-[220px]' title={employee.name || ''}>
                                    {employee.name}
                                  </p>
                                  <p className='text-sm text-slate-500 truncate max-w-[240px]' title={employee.email || ''}>
                                    {employee.email}
                                  </p>
                                </div>
                              </td>
                              <td className='p-4 text-slate-600'>
                                <span className='block truncate' title={employee.department || '—'}>
                                  {employee.department || '—'}
                                </span>
                              </td>
                              <td className='p-4 text-slate-600'>
                                {employee.teamNames && employee.teamNames.length > 0 ? (
                                  <div className="flex items-center gap-2 max-w-[200px]">
                                    <span
                                      className="inline-flex max-w-[140px] truncate px-3 py-1 rounded-full font-medium text-xs bg-blue-100 text-blue-600"
                                      title={employee.teamNames[0]}
                                    >
                                      {employee.teamNames[0]}
                                    </span>
                                    {employee.teamNames.length > 1 && (
                                      <span className="inline-flex px-2 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
                                        +{employee.teamNames.length - 1}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex px-3 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600" title="No Team">
                                    No Team
                                  </span>
                                )}
                              </td>
                              <td className='p-4 capitalize text-sm'>
                                <span className={`px-3 py-1 rounded-full font-medium text-xs ${employee.role === 'owner' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {employee.role}
                                </span>
                              </td>
                              <td className='p-4 text-sm'>
                                <span className={`px-3 py-1 rounded-full font-medium text-xs flex items-center gap-1.5 ${employee.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  <span className={`w-2 h-2 rounded-full ${employee.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                  {employee.isVerified ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className='p-4 flex items-center justify-end gap-2'>
                                <button onClick={() => onEditClick(employee)} className='p-2 rounded-full text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors'>
                                  <SquarePenIcon className='w-5 h-5' />
                                </button>
                                <button onClick={() => onDeleteClick(employee)} className='p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors'>
                                  <Trash2Icon className='w-5 h-5' />
                                </button>
                              </td>
                            </tr>
                          )) :
                            <tr>
                              <td colSpan="6" className='p-8 text-center text-slate-500'>No employees found.</td>
                            </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 flex-1 overflow-y-auto">
                  {
                    !loading && sortedEmployees?.length > 0 ? sortedEmployees.map((employee) => (
                      <div key={employee.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {renderUserAvatar(employee)}
                            <div className='min-w-0'>
                              <p className='font-semibold text-slate-800 truncate max-w-[180px]' title={employee.name || ''}>{employee.name}</p>
                              <p className={`text-sm font-medium ${employee.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>{employee.isVerified ? 'Active' : 'Inactive'}</p>
                            </div>
                          </div>
                          <div className='flex items-center gap-1'>
                            <button onClick={() => onEditClick(employee)} className='p-2 rounded-full text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors'>
                              <SquarePenIcon className='w-5 h-5' />
                            </button>
                            <button onClick={() => onDeleteClick(employee)} className='p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors'>
                              <Trash2Icon className='w-5 h-5' />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate" title={employee.email || ''}>{employee.email}</span>
                          </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${employee.role === 'owner' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {employee.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="truncate" title={employee.department || '—'}>
                        {employee.department || '—'}
                      </span>
                    </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="truncate" title={(employee.teamNames && employee.teamNames.join(', ')) || 'No Team'}>
                            {employee.teamNames?.join(', ') || 'No Team'}
                          </span>
                        </div>
                        </div>
                      </div>
                    )) :
                    <div className='p-8 text-center text-slate-500'>No employees found.</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOpen.open && isOpen.type !== 'delete' && isOpen.type !== 'createTeam' && (
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

      {isOpen.open && isOpen.type === 'createTeam' && (
          <TeamForm team={selectedTeam} type={isOpen.type} isLoading={teamActionLoading} setIsOpen={setIsOpen} onSubmit={onTeamFormSubmit} currentUser={user} />
      )}

      {isOpen.type === 'delete' && isOpen.open && (
        <DeleteConfirmation loading={actionLoading} itemName={selectedEmployee?.name} setIsOpen={setIsOpen} onDelete={onDeleteEmployeeConfirm} />
      )}
    </div>
  )
}

export default ManageEmployeePage;
