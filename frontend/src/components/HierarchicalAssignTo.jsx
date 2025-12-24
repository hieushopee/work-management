import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Users, User, Search } from 'lucide-react';

const UNASSIGNED_TEAM_ID = 'unassigned';

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (value.id && value.id !== value) return toIdString(value.id);
    if (value._id && value._id !== value) return toIdString(value._id);
    if (value.teamId && value.teamId !== value) return toIdString(value.teamId);
    if (value.userId && value.userId !== value) return toIdString(value.userId);
    const str = value.toString?.();
    if (str && str !== '[object Object]') {
      return str;
    }
  }
  return null;
};

const getTeamId = (team) => {
  if (!team) return null;
  return toIdString(team);
};

const getEmployeeId = (employee) => {
  if (!employee) return null;
  return toIdString(employee);
};

const getAssignmentId = (assignment) => {
  if (!assignment) return null;
  
  // If assignment is already a string (ObjectId), return it
  if (typeof assignment === 'string') return assignment;
  
  // If assignment has an id field, use it
  if (assignment.id) return toIdString(assignment.id);
  
  // If assignment is an object with _id field, use it
  if (assignment._id) return toIdString(assignment._id);
  
  // Fallback to converting the entire assignment
  return toIdString(assignment);
};

const HierarchicalAssignTo = ({
  teams = [],
  employees = [],
  selectedAssignments = [],
  onChange,
  error = false,
  placeholder = "Select teams and employees"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTeamId, setActiveTeamId] = useState(null);
  const dropdownRef = useRef(null);

  // Ensure selectedAssignments is always an array
  const safeSelectedAssignments = Array.isArray(selectedAssignments) ? selectedAssignments : [];

  const baseTeamMembersMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(teams) ? teams : []).forEach((team) => {
      const teamId = getTeamId(team);
      if (!teamId) return;
      const memberSet = new Set(
        (team.members || []).map((member) => getEmployeeId(member)).filter(Boolean)
      );
      map.set(teamId, memberSet);
    });
    return map;
  }, [teams]);

  const employeeTeamsMap = useMemo(() => {
    const map = new Map();

    const ensureEntry = (employeeId) => {
      if (!map.has(employeeId)) {
        map.set(employeeId, new Set());
      }
      return map.get(employeeId);
    };

    (Array.isArray(teams) ? teams : []).forEach((team) => {
      const teamId = getTeamId(team);
      if (!teamId) return;
      (team.members || []).forEach((member) => {
        const memberId = getEmployeeId(member);
        if (!memberId) return;
        ensureEntry(memberId).add(teamId);
      });
    });

    (Array.isArray(employees) ? employees : []).forEach((employee) => {
      const employeeId = getEmployeeId(employee);
      if (!employeeId) return;
      const teamSet = ensureEntry(employeeId);
      const teamsValue = Array.isArray(employee.teams) ? employee.teams : [];
      teamsValue.forEach((teamInfo) => {
        const teamId = getTeamId(teamInfo);
        if (!teamId) return;
        teamSet.add(teamId);
      });
      if (teamSet.size === 0) {
        teamSet.add(UNASSIGNED_TEAM_ID);
      }
    });

    return map;
  }, [teams, employees]);

  const unassignedEmployees = useMemo(() => {
    return (Array.isArray(employees) ? employees : []).filter((employee) => {
      const employeeId = getEmployeeId(employee);
      if (!employeeId) return false;
      const teamSet = employeeTeamsMap.get(employeeId);
      return !teamSet || (teamSet.size === 1 && teamSet.has(UNASSIGNED_TEAM_ID));
    });
  }, [employees, employeeTeamsMap]);

  const teamMembersMap = useMemo(() => {
    const map = new Map(baseTeamMembersMap);
    if (unassignedEmployees.length > 0) {
      map.set(
        UNASSIGNED_TEAM_ID,
        new Set(
          unassignedEmployees
            .map((employee) => getEmployeeId(employee))
            .filter(Boolean)
        )
      );
    }
    return map;
  }, [baseTeamMembersMap, unassignedEmployees]);

  const teamsWithUnassigned = useMemo(() => {
    const baseTeams = Array.isArray(teams) ? teams : [];
    if (unassignedEmployees.length > 0) {
      return [
        {
          id: UNASSIGNED_TEAM_ID,
          name: 'Unassigned',
          members: unassignedEmployees,
        },
        ...baseTeams,
      ];
    }
    return baseTeams;
  }, [teams, unassignedEmployees]);

  const normalizedAssignments = useMemo(() => {
    const resultMap = new Map();

    safeSelectedAssignments.forEach((assignment) => {
      if (!assignment) return;

      let type = assignment.type;
      let id =
        toIdString(assignment.id) ??
        toIdString(assignment._id) ??
        toIdString(assignment.teamId) ??
        toIdString(assignment.userId) ??
        toIdString(assignment);

      if (!id) return;

      if (!type) {
        if (teamsWithUnassigned.some((team) => getTeamId(team) === id)) {
          type = 'team';
        } else if (employees.some((employee) => getEmployeeId(employee) === id)) {
          type = 'employee';
        } else {
          type = 'employee';
        }
      }

      let name = assignment.name;
      if (!name) {
        if (type === 'team') {
          const matchedTeam = teamsWithUnassigned.find((team) => getTeamId(team) === id);
          name = matchedTeam?.name || '';
        } else if (type === 'employee') {
          const matchedEmployee = employees.find((employee) => getEmployeeId(employee) === id);
          name = matchedEmployee?.name || '';
        }
      }

      const key = `${type}:${id}`;
      if (!resultMap.has(key)) {
        resultMap.set(key, {
          ...assignment,
          type,
          id,
          name: name || '',
        });
      }
    });

    return Array.from(resultMap.values());
  }, [safeSelectedAssignments, teams, employees]);

  useEffect(() => {
    const selectedTeam = normalizedAssignments.find((assignment) => assignment.type === 'team');
    if (selectedTeam) {
      setActiveTeamId((current) => (current === null ? selectedTeam.id : current));
    } else {
      setActiveTeamId((current) =>
        current && current !== UNASSIGNED_TEAM_ID ? null : current
      );
    }
  }, [normalizedAssignments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter teams and employees based on search
  const filteredTeams = teamsWithUnassigned.filter(team =>
    team.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(employee =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const employeesForActiveTeam = useMemo(() => {
    if (!activeTeamId) return [];
    const memberIds = teamMembersMap.get(activeTeamId);
    return filteredEmployees.filter((employee) => {
      const employeeId = getEmployeeId(employee);
      if (!employeeId) return false;
      if (memberIds && memberIds.size > 0) {
        return memberIds.has(employeeId);
      }
      const employeeTeamSet = employeeTeamsMap.get(employeeId);
      return employeeTeamSet ? employeeTeamSet.has(activeTeamId) : false;
    });
  }, [activeTeamId, filteredEmployees, teamMembersMap, employeeTeamsMap]);

  const assignments = normalizedAssignments;

  const getMemberIdsForTeam = (teamId) => {
    const memberIds = new Set();
    const mapMembers = teamMembersMap.get(teamId);
    if (mapMembers && mapMembers.size > 0) {
      mapMembers.forEach((id) => memberIds.add(id));
    } else {
      employees.forEach((employee) => {
        const employeeId = getEmployeeId(employee);
        if (!employeeId) return;
        const teamSet = employeeTeamsMap.get(employeeId);
        if (teamSet && teamSet.has(teamId)) {
          memberIds.add(employeeId);
        }
      });
    }
    return memberIds;
  };

  // Get employees to display in right column
  const getEmployeesToShow = () => {
    return employeesForActiveTeam;
  };

  // Check if team is selected
  const isTeamSelected = (teamId) => {
    const normalizedTeamId = getTeamId(teamId);
    if (!normalizedTeamId || normalizedTeamId === UNASSIGNED_TEAM_ID) return false;

    return assignments.some(assignment => {
      if (assignment.type !== 'team') return false;
      
      // Handle both string and object formats
      const assignmentId = getAssignmentId(assignment);
      return assignmentId === normalizedTeamId;
    });
  };

  // Check if employee is selected
  const isEmployeeSelected = (employeeId) => {
    const normalizedEmployeeId = getEmployeeId(employeeId);
    if (!normalizedEmployeeId) return false;

    return assignments.some(assignment => {
      if (assignment.type !== 'employee') return false;
      
      // Handle both string and object formats
      const assignmentId = getAssignmentId(assignment);
      return assignmentId === normalizedEmployeeId;
    });
  };

  // Handle team selection (checkbox only)
  const handleTeamToggle = (team) => {
    const normalizedTeamId = getTeamId(team);
    if (!normalizedTeamId) return;

    if (normalizedTeamId === UNASSIGNED_TEAM_ID) {
      setActiveTeamId((current) => (current === normalizedTeamId ? null : normalizedTeamId));
      return;
    }

    const isSelected = isTeamSelected(normalizedTeamId);
    let newAssignments = [...assignments];

    if (isSelected) {
      newAssignments = newAssignments.filter(
        (assignment) =>
          !(assignment.type === 'team' && getAssignmentId(assignment) === normalizedTeamId)
      );

      const memberIds = getMemberIdsForTeam(normalizedTeamId);
      if (memberIds.size > 0) {
        const remainingTeamIds = new Set(
          newAssignments
            .filter((assignment) => assignment.type === 'team')
            .map((assignment) => getAssignmentId(assignment))
            .filter(Boolean)
        );

        newAssignments = newAssignments.filter((assignment) => {
          if (assignment.type !== 'employee') return true;
          const assignmentId = getAssignmentId(assignment);
          if (!assignmentId) return true;
          if (!memberIds.has(assignmentId)) return true;

          const employeeTeamSet = employeeTeamsMap.get(assignmentId) || new Set();
          const coveredByOtherTeam = Array.from(employeeTeamSet).some((teamId) =>
            remainingTeamIds.has(teamId)
          );
          return coveredByOtherTeam;
        });
      }

      setActiveTeamId((current) => {
        if (current !== normalizedTeamId) return current;
        const remainingTeam = newAssignments.find((assignment) => assignment.type === 'team');
        return remainingTeam ? getAssignmentId(remainingTeam) : null;
      });
    } else {
      newAssignments.push({
        type: 'team',
        id: normalizedTeamId,
        name: team.name,
      });

      const memberIds = getMemberIdsForTeam(normalizedTeamId);
      if (memberIds.size > 0) {
        const existingEmployeeIds = new Set(
          newAssignments
            .filter((assignment) => assignment.type === 'employee')
            .map((assignment) => getAssignmentId(assignment))
            .filter(Boolean)
        );

        memberIds.forEach((memberId) => {
          if (!memberId || existingEmployeeIds.has(memberId)) return;
          const employeeName =
            employees.find((employee) => getEmployeeId(employee) === memberId)?.name || '';
          newAssignments.push({
            type: 'employee',
            id: memberId,
            name: employeeName,
          });
        });
      }

      setActiveTeamId(normalizedTeamId);
    }

    onChange(newAssignments);
  };

  const handleTeamRowClick = (teamId) => {
    const normalizedTeamId = getTeamId(teamId);
    if (!normalizedTeamId) return;
    setActiveTeamId((current) => (current === normalizedTeamId ? null : normalizedTeamId));
  };

  // Handle employee selection
  const handleEmployeeToggle = (employee) => {
    const normalizedEmployeeId = getEmployeeId(employee);
    if (!normalizedEmployeeId) return;

    const isSelected = isEmployeeSelected(normalizedEmployeeId);
    let newAssignments = [...assignments];

    if (isSelected) {
      newAssignments = newAssignments.filter(assignment =>
        !(assignment.type === 'employee' && getAssignmentId(assignment) === normalizedEmployeeId)
      );

      // Check if this employee belongs to any selected team
      // If after removing this employee, a team has no more selected members, remove that team too
      const employeeTeamSet = employeeTeamsMap.get(normalizedEmployeeId) || new Set();
      const selectedTeams = newAssignments.filter(a => a.type === 'team');

      selectedTeams.forEach(teamAssignment => {
        const teamId = getAssignmentId(teamAssignment);
        if (!teamId || !employeeTeamSet.has(teamId)) return;

        // Count remaining selected members of this team
        const teamMemberIds = getMemberIdsForTeam(teamId);
        const remainingSelectedMembers = newAssignments.filter(a => {
          if (a.type !== 'employee') return false;
          const empId = getAssignmentId(a);
          return empId && teamMemberIds.has(empId);
        });

        // If no members left selected for this team, remove the team
        if (remainingSelectedMembers.length === 0) {
          newAssignments = newAssignments.filter(a =>
            !(a.type === 'team' && getAssignmentId(a) === teamId)
          );
        }
      });
    } else {
      newAssignments.push({
        type: 'employee',
        id: normalizedEmployeeId,
        name: employee.name
      });
    }

    onChange(newAssignments);
  };

  // Handle select all employees
  const handleSelectAllEmployees = () => {
    const employeesToShow = getEmployeesToShow();
    if (!employeesToShow.length) return;

    const newAssignments = [...assignments];

    employeesToShow.forEach(employee => {
      const normalizedEmployeeId = getEmployeeId(employee);
      if (!normalizedEmployeeId) return;

      if (!isEmployeeSelected(normalizedEmployeeId)) {
        newAssignments.push({
          type: 'employee',
          id: normalizedEmployeeId,
          name: employee.name
        });
      }
    });

    onChange(newAssignments);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    onChange([]);
    setActiveTeamId(null);
  };

  const displayInfo = useMemo(() => {
    if (assignments.length === 0) {
      return { tokens: [], extra: 0 };
    }

    const tokens = [];
    const seenKeys = new Set();
    const teamAssignments = assignments.filter((a) => a.type === 'team');
    const employeeAssignments = assignments.filter((a) => a.type === 'employee');
    const selectedTeamIds = new Set(
      teamAssignments
        .map((assignment) => getAssignmentId(assignment))
        .filter(Boolean)
    );

    const pushToken = (label, key) => {
      if (!label || seenKeys.has(key)) return;
      tokens.push({ label, key });
      seenKeys.add(key);
    };

    teamAssignments.forEach((team) => {
      const teamId = getAssignmentId(team);
      const label = team.name || 'Team';
      const key = `team:${teamId || label}`;
      pushToken(label, key);
    });

    const belongsToSelectedTeam = (employeeId) => {
      if (!employeeId) return false;
      const teamSet = employeeTeamsMap.get(employeeId);
      if (!teamSet) return false;
      for (const teamId of teamSet) {
        if (teamId !== UNASSIGNED_TEAM_ID && selectedTeamIds.has(teamId)) {
          return true;
        }
      }
      return false;
    };

    employeeAssignments.forEach((employee) => {
      const employeeId = getAssignmentId(employee);
      if (belongsToSelectedTeam(employeeId)) return;
      const label = employee.name || '';
      if (!label) return;
      const key = `employee:${employeeId || label}`;
      pushToken(label, key);
    });

    const visibleTokens = tokens.slice(0, 1);
    const extra = tokens.length > 1 ? tokens.length - 1 : 0;

    return { tokens: visibleTokens, extra };
  }, [assignments, employeeTeamsMap]);

  const employeesToShow = getEmployeesToShow();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Input */}
      <div
        className={`w-full px-3 py-3 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
          error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
            : 'border-border-light focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 bg-blue-50/30'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Users className={`w-5 h-5 ${error ? 'text-red-400' : 'text-slate-400'}`} />
            {displayInfo.tokens.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                {displayInfo.tokens.map((token) => (
                  <span
                    key={token.key}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-600"
                  >
                    {token.label}
                  </span>
                ))}
                {displayInfo.extra > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-bg-hover px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    +{displayInfo.extra}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-500">{placeholder}</span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-light rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-border-light">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                id="search-assignments"
                name="search-assignments"
                placeholder="Search teams and employees..."
                className="w-full pl-10 pr-3 py-2 border border-border-light rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoComplete="off"
                aria-label="Search teams and employees"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex max-h-80">
            {/* Left Column - Teams */}
            <div className="flex-1 border-r border-border-light">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">Teams</h4>
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {filteredTeams.map((team, index) => {
                    const teamId = getTeamId(team);
                    const isSelectedTeam =
                      teamId && teamId !== UNASSIGNED_TEAM_ID ? isTeamSelected(teamId) : false;
                    const isActiveTeam = activeTeamId === teamId;

                    return (
                      <div
                        key={teamId || `team-${index}`}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          isActiveTeam || isSelectedTeam ? 'bg-green-50' : ''
                        } cursor-pointer`}
                        onClick={() => handleTeamRowClick(teamId)}
                      >
                        {teamId !== UNASSIGNED_TEAM_ID ? (
                          <input
                            type="checkbox"
                            id={`team-${teamId || index}`}
                            name={`team-${teamId || index}`}
                            checked={teamId ? isTeamSelected(teamId) : false}
                            onChange={() => handleTeamToggle(team)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-green-600 border-border-light rounded focus:ring-green-500"
                            aria-label={`Select team ${team.name}`}
                          />
                        ) : (
                          <span className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span className="text-sm text-text-main flex-1">{team.name}</span>
                        <span className="text-xs text-text-secondary bg-bg-hover px-2 py-0.5 rounded-full">
                          {Array.isArray(team.members) ? team.members.length : 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Employees */}
            <div className="flex-1">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    {employeesToShow.length > 0 ? 'Employees' : 'Select a team'}
                  </h4>
                  {employeesToShow.length > 0 && (
                    <button
                      onClick={handleSelectAllEmployees}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      Select all
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {employeesToShow.length > 0 ? (
                    employeesToShow.map((employee, index) => {
                      const employeeId = getEmployeeId(employee);
                      return (
                        <div
                          key={employeeId || `employee-${index}`}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-bg-secondary ${
                            employeeId && isEmployeeSelected(employeeId) ? 'bg-green-50' : ''
                          }`}
                          onClick={() => handleEmployeeToggle(employee)}
                        >
                          <input
                            type="checkbox"
                            id={`employee-${employeeId || index}`}
                            name={`employee-${employeeId || index}`}
                            checked={employeeId ? isEmployeeSelected(employeeId) : false}
                            onChange={() => handleEmployeeToggle(employee)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-green-600 border-border-light rounded focus:ring-green-500"
                            aria-label={`Select employee ${employee.name}`}
                          />
                          <User className="w-4 h-4 text-text-muted" />
                          <span className="text-sm text-text-main flex-1">{employee.name}</span>
                          <span className="text-xs text-text-secondary">{employee.role}</span>
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchicalAssignTo;
