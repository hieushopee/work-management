import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckSquare, CircleUserRoundIcon, LogOut, User, Building2 } from 'lucide-react';
import useUserStore from '../stores/useUserStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import axios from '../libs/axios';

const Header = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const { logout, user } = useUserStore();
  const { workspace, getCurrentWorkspace } = useWorkspaceStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const { setWorkspace } = useWorkspaceStore.getState();

  useEffect(() => {
    if (user) {
      // Only fetch workspace if user has workspace field and it's a valid MongoDB ObjectId
      if (user.workspace) {
        const workspaceId = String(user.workspace);
        const isValidWorkspaceId = /^[0-9a-fA-F]{24}$/.test(workspaceId);
        
        if (isValidWorkspaceId) {
          getCurrentWorkspace().catch(() => {
            // Silently handle all errors - they're expected if user has no workspace or invalid workspace ID
            // If fetch fails, try to get from localStorage
            const savedWorkspaceId = localStorage.getItem('workspaceId');
            const savedWorkspaceName = localStorage.getItem('workspaceName');
            if (savedWorkspaceId && savedWorkspaceName) {
              useWorkspaceStore.getState().setWorkspace({ id: savedWorkspaceId, name: savedWorkspaceName });
            }
          });
        } else {
          // Invalid workspace ID format - use localStorage if available
          const savedWorkspaceId = localStorage.getItem('workspaceId');
          const savedWorkspaceName = localStorage.getItem('workspaceName');
          if (savedWorkspaceId && savedWorkspaceName) {
            useWorkspaceStore.getState().setWorkspace({ id: savedWorkspaceId, name: savedWorkspaceName });
          }
        }
      } else {
        // User has no workspace, try to get from localStorage
        const workspaceId = localStorage.getItem('workspaceId');
        const workspaceName = localStorage.getItem('workspaceName');
        if (workspaceId && workspaceName) {
          useWorkspaceStore.getState().setWorkspace({ id: workspaceId, name: workspaceName });
        }
      }
    } else {
      // Load from localStorage if not authenticated
      const workspaceId = localStorage.getItem('workspaceId');
      const workspaceName = localStorage.getItem('workspaceName');
      if (workspaceId && workspaceName) {
        useWorkspaceStore.getState().setWorkspace({ id: workspaceId, name: workspaceName });
      }
    }
  }, [user, getCurrentWorkspace]);

  const onProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isNotificationOpen) return;

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id, user.role);
    }
  }, [user?.id, user?.role, fetchNotifications]);

  const workspaceName =
    workspace?.name ||
    localStorage.getItem('workspaceName') ||
    'Employee Task Management';

  useEffect(() => {
    const ensureWorkspaceName = async () => {
      if (workspace?.name) return;

      const candidateId =
        (typeof user?.workspace === 'string' && user.workspace) ||
        localStorage.getItem('workspaceId');
      if (!candidateId) return;

      try {
        const res = await axios.get(`/workspace/${candidateId}`);
        const fetchedName = res.data?.workspace?.name || res.data?.name;
        if (fetchedName) {
          setWorkspace({
            id: res.data?.workspace?.id || res.data?.id || candidateId,
            name: fetchedName,
          });
          localStorage.setItem('workspaceId', candidateId);
          localStorage.setItem('workspaceName', fetchedName);
        }
      } catch (error) {
        // Silent fallback; header will use default label
        console.warn('Could not fetch workspace name, using fallback label.');
      }
    };

    ensureWorkspaceName();
  }, [workspace?.name, user?.workspace]);

  return (
    <div className='relative z-50 w-full bg-white border-b border-border-light shadow-soft'>
      <div className='flex h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-8'>
        <button
          type='button'
          onClick={() => navigate('/')}
          className='flex items-center gap-3 px-2 py-1.5 transition-all duration-200 hover:opacity-80'
        >
          <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-soft'>
            <CheckSquare className='h-5 w-5' />
          </div>
          <div className='flex flex-col items-start'>
            <span className='text-base sm:text-lg font-semibold text-text-main leading-tight'>{workspaceName}</span>
          </div>
        </button>

        <div className='flex items-center justify-end gap-4'>
          <div className='relative' ref={notificationRef}>
            <button
              type='button'
              className='relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-text-secondary transition-colors duration-200 hover:bg-bg-hover hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              aria-label='Notifications'
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
              }}
            >
              <Bell className='h-5 w-5' />
              {unreadCount > 0 && (
                <span className='absolute top-1.5 right-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white'>
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotificationOpen && (
              <div className='absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-border-light bg-white shadow-soft-xl'>
                <div className='flex items-center justify-between border-b border-border-light px-4 py-3'>
                  <p className='text-sm font-semibold text-text-main'>Notifications</p>
                  <button
                    type='button'
                    className='text-xs font-medium text-primary hover:text-primary-hover transition-colors duration-200'
                    onClick={() => {
                      markAllAsRead();
                    }}
                  >
                    Mark all as read
                  </button>
                </div>
                <div className='max-h-72 overflow-y-auto'>
                  {notifications.length === 0 ? (
                    <p className='px-4 py-6 text-center text-sm text-text-secondary'>You're all caught up!</p>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        type='button'
                        onClick={() => {
                          const route = notif.meta?.route;
                          markNotificationAsRead(notif.id);
                          if (route) {
                            navigate(route);
                            setIsNotificationOpen(false);
                          }
                        }}
                        className={`w-full border-b border-border-light px-4 py-3 text-left transition-colors duration-200 hover:bg-bg-hover ${
                          notif.read ? 'bg-white' : 'bg-primary-50'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <div>
                            <p className='text-sm font-semibold text-text-main'>{notif.title}</p>
                            <p className='text-xs text-text-secondary'>{notif.description}</p>
                          </div>
                          {notif.count > 1 && (
                            <span className='inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white'>
                              {notif.count}
                            </span>
                          )}
                        </div>
                        <span className='text-[11px] text-text-muted'>{notif.timeAgo}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className='space-y-1 text-right'>
            <p className='text-sm font-semibold text-text-main leading-tight'>{user?.name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              user?.role === 'admin' ? 'bg-red-100 text-red-700' : 
              user?.role === 'manager' ? 'bg-primary-light text-primary' : 
              'bg-bg-secondary text-text-secondary'
            }`}>
              {user?.role || 'member'}
            </span>
          </div>

          <div className='relative' ref={dropdownRef}>
            <button
              type='button'
              onClick={toggleDropdown}
              className='flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              aria-haspopup='menu'
              aria-expanded={isDropdownOpen}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User avatar'}
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                <CircleUserRoundIcon className='h-11 w-11 text-white' />
              )}
            </button>
            {isDropdownOpen && (
              <div
                className='absolute right-0 top-14 z-40 min-w-[180px] overflow-hidden rounded-2xl border border-border-light bg-white shadow-soft-xl'
                role='menu'
              >
                <button
                  type='button'
                  className='flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-main transition-colors duration-200 hover:bg-bg-hover hover:text-primary'
                  onClick={onProfileClick}
                  role='menuitem'
                >
                  <User className='w-4 h-4' />
                  <span>Profile</span>
                </button>
                <button
                  type='button'
                  className='flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-main transition-colors duration-200 hover:bg-bg-hover hover:text-primary'
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  role='menuitem'
                >
                  <LogOut className='w-4 h-4' />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header
