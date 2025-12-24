/**
 * Role utility functions for permission management
 * 
 * Roles:
 * - admin: Full access to everything, can manage all users and settings
 * - manager: Can manage all accounts in their department (department head)
 * - staff: Regular employee, can manage personal items only
 */

/**
 * Check if user is admin
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

/**
 * Check if user is manager
 */
export const isManager = (user) => {
  return user?.role === 'manager';
};

/**
 * Check if user is staff
 */
export const isStaff = (user) => {
  return user?.role === 'staff';
};

/**
 * Check if user has owner-level permissions (admin or manager)
 * This replaces the old 'owner' role checks
 */
export const hasOwnerPermissions = (user) => {
  return isAdmin(user) || isManager(user);
};

/**
 * Check if user can manage a specific department
 * - Admin can manage all departments
 * - Manager can only manage their own department
 * - Staff cannot manage any department
 */
export const canManageDepartment = (user, targetDepartment) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userDepartment = user.department || '';
    return userDepartment === targetDepartment;
  }
  return false;
};

/**
 * Check if user can manage a specific user
 * - Admin can manage all users
 * - Manager can manage users in their department
 * - Staff can only manage themselves
 */
export const canManageUser = (user, targetUser) => {
  if (!user || !targetUser) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) {
    const userDepartment = user.department || '';
    const targetDepartment = targetUser.department || '';
    return userDepartment === targetDepartment;
  }
  if (isStaff(user)) {
    const userId = String(user.id || user._id || '');
    const targetUserId = String(targetUser.id || targetUser._id || '');
    return userId === targetUserId;
  }
  return false;
};

/**
 * Check if user can view all data (not just their own)
 * - Admin: yes
 * - Manager: yes (within their department)
 * - Staff: no
 */
export const canViewAll = (user) => {
  return hasOwnerPermissions(user);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'staff':
      return 'Staff';
    default:
      return role || 'Unknown';
  }
};

/**
 * Get role badge color classes
 */
export const getRoleBadgeClasses = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'manager':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'staff':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};




