import React from 'react';
import { Users, User, FolderPlus, FileText } from 'lucide-react';

const TeamSidebar = ({ teams, employees, onTeamSelect, onShowAll, onCreateTeam, onCreateEmployee, selectedTeam }) => {
  const getTeamMembers = (teamName) => {
    if (!employees || !Array.isArray(employees)) {
      return [];
    }

    const members = employees.filter(emp => {
      if (!emp) return false;

      // Handle both old teamName format and new teamNames array format
      if (emp.teamName && typeof emp.teamName === 'string') {
        return emp.teamName === teamName;
      }

      if (emp.teamNames && Array.isArray(emp.teamNames)) {
        return emp.teamNames.includes(teamName);
      }

      return false;
    });

    return members;
  };

  const getUnassignedMembers = () => {
    if (!employees || !Array.isArray(employees)) {
      return [];
    }

    const unassigned = employees.filter(emp => {
      if (!emp) return true;

      // Handle both old teamName format and new teamNames array format
      if (emp.teamName && typeof emp.teamName === 'string') {
        return !emp.teamName || emp.teamName.trim() === '';
      }

      if (emp.teamNames && Array.isArray(emp.teamNames)) {
        return !emp.teamNames || emp.teamNames.length === 0;
      }

      return true; // If no team data, consider unassigned
    });

    return unassigned;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Teams & Members
        </h2>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={onShowAll}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Show All Employees"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">All</span>
          </button>
          
          <button
            onClick={onCreateTeam}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
            title="Create New Team"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Team</span>
          </button>
          
          <button
            onClick={onCreateEmployee}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
            title="Create New Employee"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Employee</span>
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* Teams */}
          {teams?.map((team) => {
            const members = getTeamMembers(team.name);
            const isSelected = selectedTeam === (team.id || team._id);

            return (
              <div
                key={team.id || team._id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
                onClick={() => onTeamSelect?.(team)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{team.name}</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                    {members.length}
                  </span>
                </div>
                {team.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{team.description}</p>
                )}
              </div>
            );
          })}

          {/* Unassigned Members */}
          {getUnassignedMembers().length > 0 && (
            <div
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedTeam === 'unassigned'
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
              onClick={() => onTeamSelect?.({ id: 'unassigned', name: 'Unassigned' })}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Unassigned</span>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                  {getUnassignedMembers().length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Members without team</p>
            </div>
          )}

          {/* No Teams Message */}
          {(!teams || teams.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No teams created yet</p>
              <p className="text-xs text-gray-400">Create your first team to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSidebar;
