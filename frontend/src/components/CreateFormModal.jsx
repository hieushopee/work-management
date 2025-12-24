import React, { useEffect, useMemo, useState } from 'react';
import axios from '../libs/axios';
import { X, Plus, Trash2, Settings, ToggleRight, Lock, Users, Pin, Building2, Users2, Globe2 } from 'lucide-react';
import useTeamStore from '../stores/useTeamStore';
import useDepartmentStore from '../stores/useDepartmentStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import useUserStore from '../stores/useUserStore';

const CreateFormModal = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('forever');
  
  // Settings
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visibility
  const [scope, setScope] = useState('company'); // 'company' | 'department' | 'team' | 'users'
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const { teams, getAllTeams } = useTeamStore();
  const { departments, getAllDepartments } = useDepartmentStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const { user } = useUserStore();

  useEffect(() => {
    getAllTeams();
    getAllDepartments();
    getAllUsers();
  }, [getAllTeams, getAllDepartments, getAllUsers]);

  const role = (user?.role || '').toLowerCase();
  const currentDeptId = user?.department || user?.departmentId || '';
  const currentTeamNames = Array.isArray(user?.teamNames) ? user.teamNames : [];

  const departmentOptions = useMemo(() => {
    const all = Array.isArray(departments) ? departments.map((d) => ({ id: d.id || d._id, name: d.name })) : [];
    if (role === 'admin' || role === 'owner') return all;
    // Manager/Staff: only department of current user (still show it so they see what is selected)
    return all.filter((d) => (d.id && currentDeptId) ? String(d.id) === String(currentDeptId) : false);
  }, [departments, role, currentDeptId]);

  const teamOptions = useMemo(() => {
    const all = Array.isArray(teams)
      ? teams.map((t) => ({
          id: t.id || t._id,
          name: t.name,
          department: t.department || t.departmentId || '',
          members: t.members || [],
        }))
      : [];

    if (role === 'admin' || role === 'owner') return all;

    if (role === 'manager') {
      return all.filter((t) => (t.department && currentDeptId) ? String(t.department) === String(currentDeptId) : false);
    }

    // staff: only teams that include the current user
    const meId = user?._id || user?.id;
    return all.filter((t) => {
      const hasName = currentTeamNames.includes(t.name);
      const memberHit = Array.isArray(t.members) && t.members.some((m) => String(m) === String(meId) || String(m?._id || m?.id) === String(meId));
      return hasName || memberHit;
    });
  }, [teams, role, currentDeptId, currentTeamNames, user?._id, user?.id]);

  const userOptions = useMemo(() => {
    const all = Array.isArray(employees)
      ? employees.map((u) => ({
          id: u.id || u._id,
          name: u.name || u.email,
          email: u.email || u.username || '',
          role: (u.role || '').toLowerCase(),
        }))
      : [];
    if (role === 'admin' || role === 'owner') return all;
    // Manager/Staff: exclude admins from specific users selection
    return all.filter((u) => u.role !== 'admin' && u.role !== 'owner');
  }, [employees, role]);

  // Prefill defaults when options are loaded
  useEffect(() => {
    if (!user) return;
    if (role === 'manager') {
      if (currentDeptId) {
        setSelectedDepartments([String(currentDeptId)]);
      }
      if (teamOptions.length > 0) {
        setSelectedTeams(teamOptions.map((t) => t.id));
      }
    } else if (role === 'staff') {
      if (currentDeptId) {
        setSelectedDepartments([String(currentDeptId)]);
      }
      if (teamOptions.length > 0) {
        setSelectedTeams(teamOptions.map((t) => t.id));
      }
    }
  }, [user, role, currentDeptId, teamOptions]);

  const durationOptions = [
    { label: 'Forever', value: 'forever' },
    { label: '1 Hour', value: '1h' },
    { label: '8 Hours', value: '8h' },
    { label: '1 Day', value: '1d' },
    { label: '1 Week', value: '1w' },
  ];

  const addOption = () => setOptions(prev => [...prev, '']);
  
  const updateOption = (idx, value) =>
    setOptions(prev => prev.map((o, i) => (i === idx ? value : o)));

  const removeOption = (idx) => {
    if (options.length > 2) {
        setOptions(prev => prev.filter((_, i) => i !== idx));
    }
  }

  const computeExpiresAt = () => {
    if (duration === 'forever') return null;
    const now = new Date();
    const map = {
      '1h': 60,
      '8h': 480,
      '1d': 1440,
      '1w': 10080,
    };
    const minutes = map[duration] ?? 0;
    if (minutes === 0) return null;
    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const visibility = {
          scope,
          teams: scope === 'team' ? selectedTeams : [],
          departments: scope === 'department' ? selectedDepartments : [],
          users: scope === 'users' ? selectedUsers : [],
        };
        const expiresAt = computeExpiresAt();
        await axios.post('/forms', {
            title: title.trim(),
            options: options.filter(o => o.trim()),
            duration,
            settings: {
                allowMultiple,
                allowAddOptions,
                allowAnonymous: isAnonymous,
                pinToTop: isPinned
            },
            visibility,
            expiresAt,
        });
        onCreated();
        onClose();
    } catch (error) {
        console.error("Failed to create poll:", error);
        // You might want to show a toast notification here
    } finally {
        setIsSubmitting(false);
    }
  };

  const Toggle = ({ label, enabled, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-primary' : 'bg-slate-300'}`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );

  const showDeptChooser = scope === 'department' && departmentOptions.length > 0;
  const showTeamChooser = scope === 'team' && teamOptions.length > 0;
  const showUserChooser = scope === 'users' && userOptions.length > 0;
  const showSelectionPanel = showSettings && (showDeptChooser || showTeamChooser || showUserChooser);

  const renderUserCard = (u) => {
    const initials = (u.name || u.email || '')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    return (
      <label
        key={u.id}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
          selectedUsers.includes(u.id)
            ? 'bg-primary-light border-primary/30 text-primary'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
        }`}
      >
        <input
          type="checkbox"
          className="hidden"
          checked={selectedUsers.includes(u.id)}
          onChange={() => {
            setSelectedUsers((prev) =>
              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
            );
          }}
        />
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white font-semibold flex items-center justify-center">
          {initials || 'U'}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{u.name || 'Unnamed'}</span>
          <span className="text-xs text-slate-500">{u.email || 'No email'}</span>
        </div>
      </label>
    );
  };

  const renderDeptCard = (d) => {
    const color = d.color || '#6366f1';
    const initials = (d.name || 'Dept')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return (
      <label
        key={d.id}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
          selectedDepartments.includes(d.id)
            ? 'bg-primary-light border-primary/30 text-primary'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
        }`}
      >
        <input
          type="checkbox"
          className="hidden"
          checked={selectedDepartments.includes(d.id)}
          onChange={() => {
            setSelectedDepartments((prev) =>
              prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
            );
          }}
        />
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-inner" style={{ background: color }}>
          {initials}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{d.name}</span>
          <span className="text-xs text-slate-500">Department</span>
        </div>
      </label>
    );
  };

  const renderTeamCard = (t) => {
    return (
      <label
        key={t.id}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
          selectedTeams.includes(t.id)
            ? 'bg-primary-light border-primary/30 text-primary'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
        }`}
      >
        <input
          type="checkbox"
          className="hidden"
          checked={selectedTeams.includes(t.id)}
          onChange={() => {
            setSelectedTeams((prev) =>
              prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
            );
          }}
        />
        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center">
          {t.name?.slice(0, 2).toUpperCase() || 'T'}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{t.name}</span>
          <span className="text-xs text-slate-500">Team</span>
        </div>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all min-h-[560px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: showSelectionPanel ? '1200px' : showSettings ? '1000px' : '900px' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Create New Poll</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1" style={{ minHeight: '420px' }}>
          <div
            className={`grid grid-cols-1 ${
              showSettings
                ? showSelectionPanel
                  ? 'lg:grid-cols-[1fr_0.9fr_0.9fr]'
                  : 'lg:grid-cols-[1fr_0.9fr]'
                : 'lg:grid-cols-1'
            } gap-6 transition-[grid-template-columns] duration-200`}
          >
            {/* Left column: question & options */}
            <div className="space-y-6">
              <div>
                <label htmlFor="poll-title" className="block text-sm font-bold text-slate-600 mb-1">Poll Question</label>
                <div className="rounded-lg border border-slate-300">
                  <textarea
                    id="poll-title"
                    name="poll-title"
                    maxLength={200}
                    rows={3}
                    autoComplete="off"
                    className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[96px] resize-y"
                    placeholder="What should we do for the team outing?"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                  <div className="flex justify-end px-3 pb-2 text-xs text-slate-500">{(title || '').length}/200</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Answer Options</label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        name={`option-${idx}`}
                        autoComplete="off"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => updateOption(idx, e.target.value)}
                        required={idx < 2}
                      />
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(idx)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="text-primary hover:text-primary-hover font-semibold text-sm mt-2 inline-flex items-center gap-1" onClick={addOption}><Plus className="w-4 h-4"/> Add Option</button>
              </div>
            </div>

            {/* Right column: settings */}
            {showSettings && (
            <div className="space-y-5 pt-0 lg:pt-4 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 max-h-full overflow-y-auto transition-all duration-150">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Settings className="w-5 h-5"/> Settings</h3>

                  <div className="space-y-4">
                    <Toggle label="Allow multiple answers" enabled={allowMultiple} onChange={setAllowMultiple} />
                    <Toggle label="Allow others to add options" enabled={allowAddOptions} onChange={setAllowAddOptions} />
                    <Toggle label="Anonymous voting" enabled={isAnonymous} onChange={setIsAnonymous} />
                    <Toggle label="Pin to top" enabled={isPinned} onChange={setIsPinned} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Visibility</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                      >
                        <option value="company">Company-wide</option>
                        <option value="department">Departments</option>
                        <option value="team">Teams</option>
                        <option value="users" disabled={userOptions.length === 0}>Specific users</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="duration" className="block text-sm font-semibold text-slate-700 mb-2">Poll Duration (auto-expire)</label>
                      <select
                        id="duration"
                        name="duration"
                        autoComplete="off"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                      >
                        {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                </div>
            </div>
            )}

            {/* Third column: selections */}
            {showSelectionPanel && (
              <div className="space-y-4 pt-0 lg:pt-4 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 max-h-full overflow-y-auto transition-all duration-150">
                <h3 className="text-lg font-bold text-slate-700">Select one or more</h3>

                {showDeptChooser && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Departments</p>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {departmentOptions.map(renderDeptCard)}
                    </div>
                  </div>
                )}

                {showTeamChooser && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Teams</p>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {teamOptions.map(renderTeamCard)}
                    </div>
                  </div>
                )}

                {showUserChooser && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Accounts</p>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {userOptions.map(renderUserCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between space-x-4 p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
          <button
            type="button"
            onClick={() => setShowSettings((p) => !p)}
            className="inline-flex items-center justify-center w-10 h-10 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            title={showSettings ? 'Hide settings' : 'Show settings'}
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Poll'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateFormModal;
