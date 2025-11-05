import { useEffect, useMemo, useState } from 'react'
import { CirclePlusIcon, SquarePenIcon, Trash2Icon, ArrowUpDown, ClipboardList, Calendar, User, Circle, PlayCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useTeamStore from '../../stores/useTeamStore';
import TaskForm from '../../components/TaskForm';
import DeleteConfirmation from '../../components/DeleteConfirmation';
import { formatDate } from '../../utils/formatDate';
import Filter from '../../components/Filter';

const ManageTaskPage = () => {
  const { employees, getAllUsers } = useEmployeeStore()
  const { teams, getAllTeams } = useTeamStore()
  const { tasks, getAllTasks, createTask, updateTask, deleteTask, loading, actionLoading } = useTaskStore();

  const [isOpen, setIsOpen] = useState({ type: 'create', open: false });
  const [selectedTask, setSelectedTask] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState(tasks || []);
  const [sortConfig, setSortConfig] = useState({ key: 'deadline', direction: 'descending' });

  const onEditClick = (task) => {
    setSelectedTask(task);
    setIsOpen({ type: 'edit', open: true });
  }

  const onDeleteClick = (task) => {
    setSelectedTask(task);
    setIsOpen({ type: 'delete', open: true });
  }

  const onCreateClick = () => {
    setSelectedTask(null);
    setIsOpen({ type: 'create', open: true });
  }

  const onTaskFormSubmit = async (task) => {
    if (isOpen.type === 'create') {
      await createTask(task.assignedTo, task);
    } else if (isOpen.type === 'edit') {
      await updateTask(selectedTask.id, task);
    }
    setIsOpen({ type: 'create', open: false });
  }

  const onDeleteTask = async () => {
    if (isOpen.type === 'delete') {
      await deleteTask(selectedTask.id);
      setIsOpen({ type: 'create', open: false });
    }
  }

  const employeeMap = useMemo(() => {
    if (!employees || employees.length === 0) return {};
    return employees.reduce((acc, employee) => {
      acc[employee.id] = employee;
      return acc;
    }, {});
  }, [employees]);

  const normalizeStatus = (status) => {
    return String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  };

  const normalizeRole = (role) => {
    return String(role || '').toLowerCase().trim();
  };

  const getAggregateStatus = (task) => {
    const entries = Array.isArray(task?.assigneeStatuses) ? task.assigneeStatuses : [];
    if (entries.length === 0) {
      return normalizeStatus(task?.status);
    }

    const employeeStatuses = entries
      .filter(entry => normalizeRole(entry.role) === 'employee')
      .map(entry => normalizeStatus(entry.status));

    const relevant = employeeStatuses.length > 0 ? employeeStatuses : entries.map(entry => normalizeStatus(entry.status));

    if (relevant.some(status => status === 'todo')) return 'todo';
    if (relevant.some(status => status === 'doing')) return 'doing';
    if (relevant.every(status => status === 'done' || status === 'completed')) return 'done';

    return normalizeStatus(task?.status);
  };

  const filterTasks = (query) => {
    if (query === '') {
      setFilteredTasks(tasks);
      return;
    }
    const lowercasedQuery = query.trim().toLowerCase();
    const filtered = tasks.filter(task => {
      // Handle both old single assignment and new multiple assignments
      let assignedToNames = '';
      if (Array.isArray(task.assignedTo)) {
        assignedToNames = task.assignedTo.map(assignment => 
          assignment.type === 'employee' ? employeeMap[assignment.id]?.name : assignment.name
        ).join(' ').toLowerCase();
      } else {
        assignedToNames = employeeMap[task.assignedTo]?.name.toLowerCase() || '';
      }
      
      return task.name.toLowerCase().includes(lowercasedQuery) ||
        task.description.toLowerCase().includes(lowercasedQuery) ||
        task.deadline.toLowerCase().includes(lowercasedQuery) ||
        getAggregateStatus(task).includes(lowercasedQuery) ||
        assignedToNames.includes(lowercasedQuery);
    });
    setFilteredTasks(filtered);
  }

  const sortedTasks = useMemo(() => {
    let sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'assignedTo') {
          let aValue = '';
          let bValue = '';
          
          if (Array.isArray(a.assignedTo)) {
            aValue = a.assignedTo.map(assignment => 
              assignment.type === 'employee' ? employeeMap[assignment.id]?.name : assignment.name
            ).join(', ');
          } else {
            aValue = employeeMap[a.assignedTo]?.name || '';
          }
          
          if (Array.isArray(b.assignedTo)) {
            bValue = b.assignedTo.map(assignment => 
              assignment.type === 'employee' ? employeeMap[assignment.id]?.name : assignment.name
            ).join(', ');
          } else {
            bValue = employeeMap[b.assignedTo]?.name || '';
          }
        }
        if (sortConfig.key === 'status') {
          aValue = getAggregateStatus(a);
          bValue = getAggregateStatus(b);
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTasks, sortConfig, employeeMap]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    setFilteredTasks(tasks || []);
  }, [tasks])

  useEffect(() => {
    getAllTasks();
    getAllUsers();
    getAllTeams();
  }, [getAllTasks, getAllUsers, getAllTeams])
  const renderUserAvatar = (employee, size = 'w-8 h-8') => {
    if (employee?.avatar) {
      return <img src={employee.avatar} alt={employee.name} className={`${size} rounded-full object-cover`} />;
    }
    const initials = (employee?.name || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    return <div className={`${size} flex items-center justify-center rounded-full bg-blue-500 text-white font-semibold text-xs`}>{initials}</div>;
  };

  const renderAssignedTo = (task) => {
    if (!task.assignedTo || (Array.isArray(task.assignedTo) && task.assignedTo.length === 0)) {
      return (
        <span className="px-3 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
          Unassigned
        </span>
      );
    }

    if (Array.isArray(task.assignedTo)) {
      const rawAssignments = task.assignedTo;

      // Normalize entries that might be plain IDs or missing type/name
      const normalizeAssignments = (items) => {
        return items.reduce((acc, item) => {
          if (!item) return acc;
          const id = (item.id || item._id || item.teamId || item.userId || item).toString?.() || item;
          if (!id) return acc;

          // Infer type if missing
          let type = item.type;
          if (!type) {
            if (Array.isArray(teams) && teams.some(t => (t.id === id || t._id === id))) {
              type = 'team';
            } else if (Array.isArray(employees) && employees.some(e => (e.id === id || e._id === id))) {
              type = 'employee';
            } else {
              // Default to employee for compatibility
              type = 'employee';
            }
          }

          // Resolve display name
          let name = item.name;
          if (!name) {
            if (type === 'team') {
              const t = Array.isArray(teams) ? teams.find(t => (t.id === id || t._id === id)) : null;
              name = t?.name || String(id);
            } else {
              const e = Array.isArray(employees) ? employees.find(e => (e.id === id || e._id === id)) : null;
              name = e?.name || String(id);
            }
          }

          const key = `${type}:${id}`;
          if (!acc.some(x => `${x.type}:${x.id}` === key)) {
            acc.push({ type, id, name });
          }
          return acc;
        }, []);
      };

      const assignments = normalizeAssignments(rawAssignments);
      // Debug: show normalized assignments
      try { console.debug('[AssignedTo] Task', task.id, 'normalized', assignments); } catch {}
      const teamAssignments = assignments.filter(a => a.type === 'team');
      const employeeAssignments = assignments.filter(a => a.type === 'employee');

      // If normalization produced nothing but there are raw entries, show count
      if (assignments.length === 0 && rawAssignments.length > 0) {
        const countBadge = (
          <span className="px-2 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600">+{rawAssignments.length}</span>
        );
        try { console.debug('[AssignedTo] Normalized empty, raw count', rawAssignments.length); } catch {}
        return countBadge;
      }

      // Helper function to get team member IDs
      const getTeamMemberIds = (teamId) => {
        const team = teams.find(t => t.id === teamId || t._id === teamId);
        if (!team || !team.members) return new Set();
        return new Set(team.members.map(m => m.id || m._id || m).filter(Boolean));
      };

      // Helper function to count employees in a team
      const countEmployeesForTeam = (teamId) => {
        return employeeAssignments.filter(assignment => {
          const empId = assignment.id || assignment._id;
          if (!empId) return false;
          const employee = employees.find(e => (e.id === empId || e._id === empId));
          if (!employee || !employee.teams) return false;
          return employee.teams.some(t => (t.id === teamId || t._id === teamId || t === teamId));
        }).length;
      };

      const tokens = [];
      const seen = new Set();

      const pushToken = (label, key, type) => {
        if (!label || seen.has(key)) return;
        tokens.push({ label, key, type });
        seen.add(key);
      };

      const selectedTeamIds = new Set();
      teamAssignments.forEach((team) => {
        const teamId = team.id || team._id || team;
        selectedTeamIds.add(teamId);
        pushToken(team.name || String(teamId), `team:${teamId}`, 'team');
      });

      const employeeBelongsToSelectedTeam = (employeeId) => {
        if (!employeeId || selectedTeamIds.size === 0) return false;
        const employee = employeeAssignments.find((e) => e.id === employeeId);
        const mapEntry = employees.find((emp) => (emp.id === employeeId || emp._id === employeeId));
        const teamList = mapEntry?.teams || employee?.teams || [];
        return teamList.some((teamInfo) => {
          const tId = teamInfo?.id || teamInfo?._id || teamInfo;
          return selectedTeamIds.has(tId);
        });
      };

      employeeAssignments.forEach((employee) => {
        const employeeId = employee.id || employee._id || employee;
        if (employeeBelongsToSelectedTeam(employeeId)) return;
        const label = employeeMap[employeeId]?.name || employee.name || String(employeeId);
        pushToken(label, `employee:${employeeId}`, 'employee');
      });

      if (tokens.length === 0) {
        const fallbackName =
          employeeAssignments[0]?.name ||
          employees.find((emp) => emp.id === employeeAssignments[0]?.id)?.name ||
          'Assignee';
        pushToken(fallbackName, 'fallback', 'employee');
      }

      const visibleTokens = tokens.slice(0, 1);
      const extraCount = Math.max(tokens.length - 1, 0);

      return (
        <div className="flex items-center gap-2">
          {visibleTokens.length > 0 && (
            <span
              className={`px-3 py-1 rounded-full font-medium text-xs ${
                visibleTokens[0].type === 'team'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {visibleTokens[0].label}
            </span>
          )}
          {extraCount > 0 && (
            <span className="px-2 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
              +{extraCount}
            </span>
          )}
        </div>
      );
    } else {
      // Handle old single assignment format
      const employee = employeeMap[task.assignedTo];
      return employee ? (
        <span className="px-3 py-1 rounded-full font-medium text-xs bg-blue-100 text-blue-600">
          {employee.name}
        </span>
      ) : (
        <span className="px-3 py-1 rounded-full font-medium text-xs bg-gray-100 text-gray-600">
          Unassigned
        </span>
      );
    }
  };

  const getStatusInfo = (task) => {
    const status = getAggregateStatus(task);
    const isLate = status !== 'done' && new Date(task.deadline) < new Date();
    if (isLate) return { color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Late' };
    switch (status) {
      case 'todo': return { color: 'bg-slate-100 text-slate-700', icon: <Circle className="w-4 h-4" />, label: 'To Do' };
      case 'doing': return { color: 'bg-blue-100 text-blue-700', icon: <PlayCircle className="w-4 h-4" />, label: 'In Progress' };
      case 'done': return { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed' };
      default: return { color: 'bg-slate-100 text-slate-700', icon: <Circle className="w-4 h-4" />, label: 'To Do' };
    }
  };

  const SortableHeader = ({ label, sortKey, hideIcon = false }) => {
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
    <div className='bg-white h-full font-sans flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-hidden'>
        <div className='max-w-7xl mx-auto h-full flex flex-col px-4 sm:px-6 lg:px-8 w-full gap-6 overflow-hidden'>
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Manage Tasks</h1>
              <p className="mt-1 text-sm text-slate-500">{sortedTasks?.length} Tasks</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className='flex-grow'>
                <Filter onSearch={filterTasks} />
              </div>
              <button onClick={onCreateClick} className='bg-blue-600 flex items-center gap-2 text-white hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap shadow-md hover:shadow-lg'>
                <CirclePlusIcon className='w-5 h-5' />
                Add Task
              </button>
            </div>
          </header>

          <div className='flex-1 min-h-0'>
            <div className='bg-white shadow-xl rounded-2xl overflow-hidden h-full flex flex-col min-h-0'>
          {sortedTasks && sortedTasks.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
                <div className='flex-1 overflow-y-auto'>
                  <table className='w-full text-left'>
                    <thead className='bg-slate-100/70'>
                      <tr>
                        <th className='p-4 text-slate-500 font-semibold'><SortableHeader label="Task Name" sortKey="name" /></th>
                        <th className='p-4 text-slate-500 font-semibold'><span>Status</span></th>
                        <th className='p-4 text-slate-500 font-semibold'><span>Assigned To</span></th>
                        <th className='p-4 text-slate-500 font-semibold'><SortableHeader label="Deadline" sortKey="deadline" /></th>
                        <th className='p-4 text-slate-500 font-semibold'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {sortedTasks.map((task) => {
                        const statusInfo = getStatusInfo(task);
                        return (
                          <tr key={task.id} className='hover:bg-slate-50 transition-colors'>
                            <td className='p-4'>
                              <p className='font-semibold text-slate-800'>{task.name}</p>
                              <p className='text-sm text-slate-500 truncate max-w-xs'>{task.description}</p>
                            </td>
                            <td className='p-4'>
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className='p-4'>
                              {renderAssignedTo(task)}
                            </td>
                            <td className='p-4 text-slate-600'>{formatDate(task.deadline)}</td>
                            <td className='p-4 flex items-center gap-2'>
                              <button onClick={() => onEditClick(task)} className='p-2 rounded-full text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors'><SquarePenIcon className='w-5 h-5' /></button>
                              <button onClick={() => onDeleteClick(task)} className='p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors'><Trash2Icon className='w-5 h-5' /></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100 flex-1 overflow-y-auto">
                {sortedTasks.map((task) => {
                  const statusInfo = getStatusInfo(task);
                  return (
                    <div key={task.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        <div className='flex items-center gap-1'>
                          <button onClick={() => onEditClick(task)} className='p-2 rounded-full text-slate-500 hover:bg-blue-100'><SquarePenIcon className='w-5 h-5' /></button>
                          <button onClick={() => onDeleteClick(task)} className='p-2 rounded-full text-slate-500 hover:bg-red-100'><Trash2Icon className='w-5 h-5' /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-1 truncate">{task.name}</h3>
                      <p className="text-sm text-slate-600 mb-4 h-10 overflow-y-auto">{task.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                          {renderAssignedTo(task)}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(task.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
              <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-800">No tasks found</h3>
              <p className="text-slate-500 mt-1">Get started by adding a new task.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>

      {isOpen.open && isOpen.type !== 'delete' && (
        <TaskForm
          setIsOpen={setIsOpen}
          type={isOpen.type}
          task={selectedTask}
          employees={employees}
          isLoading={actionLoading}
          onSubmit={onTaskFormSubmit}
        />
      )}

      {isOpen.type === 'delete' && (
        <DeleteConfirmation
          setIsOpen={setIsOpen}
          onDelete={onDeleteTask}
          loading={actionLoading}
          itemName={selectedTask?.name || 'Task'}
        />
      )}
    </div>
  )
}

export default ManageTaskPage


