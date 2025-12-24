import { useEffect, useState } from 'react';
import { usePermissionStore } from '../stores/usePermissionStore';
import useUserStore from '../stores/useUserStore';

/**
 * Hook to check user permissions
 * Returns merged permissions (user permissions override department permissions)
 */
export const usePermissions = () => {
  const { user } = useUserStore();
  const { myPermissions, getMyPermissions, loading } = usePermissionStore();
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      // Only fetch permissions for non-admin and non-manager users
      // Admins and managers have all permissions by default
      getMyPermissions();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      // Admin and manager have all permissions
      const allPermissions = {
        tasks: { create: true, read: true, update: true, delete: true, manage: true },
        forms: { create: true, read: true, update: true, delete: true, manage: true },
        calendar: { create: true, read: true, update: true, delete: true, manage: true },
        messages: { create: true, read: true, update: true, delete: true, manage: true },
        documents: { create: true, read: true, update: true, delete: true, manage: true },
        attendance: { create: true, read: true, update: true, delete: true, manage: true },
        salary: { create: true, read: true, update: true, delete: true, manage: true },
        employees: { create: true, read: true, update: true, delete: true, manage: true },
      };
      setPermissions(allPermissions);
    } else {
      setPermissions(myPermissions);
    }
  }, [user, myPermissions]);

  /**
   * Check if user has a specific permission
   * @param {string} module - Module name (tasks, forms, etc.)
   * @param {string} action - Action name (create, read, update, delete, manage)
   * @returns {boolean}
   */
  const hasPermission = (module, action) => {
    if (user?.role === 'admin' || user?.role === 'manager') return true; // Admin and manager have all permissions
    
    // If permissions haven't loaded yet or is null, allow default access for staff/employee
    if (!permissions || permissions === null) return true;
    
    const modulePerms = permissions[module];
    // If no permissions set for this module, allow default access
    if (!modulePerms) return true;
    
    // Check if all permissions for this module are false (meaning no permissions were explicitly set)
    const allFalse = Object.values(modulePerms).every(val => val === false);
    if (allFalse) return true; // Allow default access if all permissions are false
    
    // If manage is true, user has all permissions for that module
    if (modulePerms.manage) return true;
    
    return modulePerms[action] === true;
  };

  /**
   * Check if user can access a module at all (has at least read permission)
   * @param {string} module - Module name
   * @returns {boolean}
   */
  const canAccessModule = (module) => {
    return hasPermission(module, 'read') || hasPermission(module, 'manage');
  };

  return {
    permissions,
    hasPermission,
    canAccessModule,
    loading,
  };
};


