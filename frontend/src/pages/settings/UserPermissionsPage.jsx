import { useEffect, useState, useMemo } from 'react';
import { User, Search, Save, Shield, CircleUserRoundIcon } from 'lucide-react';
import { usePermissionStore } from '../../stores/usePermissionStore';
import useEmployeeStore from '../../stores/useEmployeeStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin } from '../../utils/roleUtils';
import { toast } from 'react-hot-toast';

const MODULES = [
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'forms', label: 'Forms', icon: '📝' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'attendance', label: 'Attendance', icon: '⏰' },
  { id: 'salary', label: 'Salary', icon: '💰' },
  { id: 'employees', label: 'Employees', icon: '👥' },
];

const ACTIONS = [
  { id: 'create', label: 'Create' },
  { id: 'read', label: 'Read' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
  { id: 'manage', label: 'Manage' },
];

const UserPermissionsPage = () => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const {
    permissions,
    getAllPermissions,
    getPermissionByTarget,
    upsertPermission,
    deletePermission,
    loading,
    actionLoading,
  } = usePermissionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState({});

  useEffect(() => {
    if (!isAdmin(user)) return;
    getAllUsers();
    loadPermissions();
  }, [user]);

  // Auto-select first user when users are loaded
  useEffect(() => {
    if (filteredEmployees.length > 0 && !selectedUser && employees?.length > 0) {
      handleSelectUser(filteredEmployees[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  const loadPermissions = async () => {
    try {
      await getAllPermissions();
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // Filter employees (exclude admin)
  const filteredEmployees = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return (employees || []).filter((emp) => {
      if (emp.role === 'admin') return false;
      return !term || 
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term);
    });
  }, [employees, searchQuery]);

  const handleSelectUser = async (employee) => {
    setSelectedUser(employee);
    try {
      const permission = await getPermissionByTarget('user', employee.id);
      if (permission && permission.modules) {
        setUserPermissions(permission);
        // Ensure all modules are initialized with proper structure
        const perms = {};
        MODULES.forEach((module) => {
          perms[module.id] = {
            create: permission.modules[module.id]?.create || false,
            read: permission.modules[module.id]?.read || false,
            update: permission.modules[module.id]?.update || false,
            delete: permission.modules[module.id]?.delete || false,
            manage: permission.modules[module.id]?.manage || false,
          };
        });
        setEditedPermissions(perms);
      } else {
        setUserPermissions(null);
        // Initialize with default empty permissions
        const defaultPerms = {};
        MODULES.forEach((module) => {
          defaultPerms[module.id] = {
            create: false,
            read: false,
            update: false,
            delete: false,
            manage: false,
          };
        });
        setEditedPermissions(defaultPerms);
      }
    } catch (error) {
      console.error('Error loading user permission:', error);
    }
  };

  const handlePermissionChange = (moduleId, actionId, value) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [actionId]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      await upsertPermission('user', selectedUser.id, editedPermissions);
      await loadPermissions();
      await handleSelectUser(selectedUser); // Reload permission
      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  };

  const handleDelete = async () => {
    if (!userPermissions || !userPermissions.id) return;
    if (!confirm('Are you sure you want to delete these permissions?')) return;
    try {
      await deletePermission(userPermissions.id);
      setSelectedUser(null);
      setUserPermissions(null);
      setEditedPermissions({});
      await loadPermissions();
      toast.success('Permissions deleted successfully');
    } catch (error) {
      console.error('Error deleting permissions:', error);
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

  if (loading && !permissions) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-full p-6">
      {/* Left Panel - User List */}
      <div className="w-80 border-r border-border-light bg-white flex flex-col">
        <div className="p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-main mb-4">Users</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-border-light bg-white text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-4 text-center text-text-secondary">
              No users found
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedUser && String(selectedUser.id) === String(emp.id);
                return (
                <button
                  key={emp.id}
                  onClick={() => handleSelectUser(emp)}
                  className={`w-full p-4 text-left hover:bg-bg-secondary transition-colors ${
                    isSelected ? 'bg-primary-light' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {emp.avatar ? (
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-white' 
                          : 'bg-bg-secondary text-text-muted'
                      }`}>
                        <CircleUserRoundIcon className="h-10 w-10" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-main truncate">{emp.name || emp.email}</div>
                      <div className="text-xs text-text-secondary truncate">{emp.email}</div>
                      {emp.department && (
                        <div className="text-xs text-text-muted">{emp.department}</div>
                      )}
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Permissions Editor */}
      <div className="flex-1 overflow-y-auto bg-bg-secondary">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-text-secondary">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a user to manage permissions</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                      <CircleUserRoundIcon className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-text-main">{selectedUser.name || selectedUser.email}</h1>
                    <p className="text-sm text-text-secondary">{selectedUser.email}</p>
                    {selectedUser.department && (
                      <p className="text-xs text-text-muted">{selectedUser.department}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {userPermissions && (
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-text-main mb-4">Module Permissions</h2>
                <div className="space-y-6">
                  {MODULES.map((module) => (
                    <div key={module.id} className="border-b border-border-light last:border-b-0 pb-6 last:pb-0">
                      <div className="mb-4">
                        <h3 className="font-semibold text-text-main">{module.label}</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {ACTIONS.map((action) => (
                          <label
                            key={action.id}
                            className="flex items-center gap-2 p-3 rounded-lg border border-border-light hover:bg-bg-secondary cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editedPermissions[module.id]?.[action.id] || false}
                              onChange={(e) => handlePermissionChange(module.id, action.id, e.target.checked)}
                              className="w-4 h-4 text-primary rounded border-border-light focus:ring-primary"
                            />
                            <span className="text-sm text-text-main">{action.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPermissionsPage;

