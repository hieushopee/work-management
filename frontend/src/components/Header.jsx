import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleUserRoundIcon, LogOut, User, Bell } from 'lucide-react';
import useUserStore from '../stores/useUserStore';
import { useNotificationStore } from '../stores/useNotificationStore';

const Header = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const { logout, user } = useUserStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllAsRead,
  } = useNotificationStore();

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

  return (
    <div className='h-20 fixed top-0 left-0 z-30 w-full flex justify-between items-center px-6 bg-white border-b border-gray-200'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md'></div>
        <h1 className='text-xl font-bold text-gray-800 tracking-wider'>
          Employee Task Management
        </h1>
      </div>
      <div className='flex justify-end items-center gap-4'>
        <div className='relative' ref={notificationRef}>
          <button
            type='button'
            className='relative inline-flex h-10 w-10 items-center justify-center text-gray-500 transition hover:text-blue-600 focus:outline-none'
            aria-label='Notifications'
            onClick={() => {
              setIsNotificationOpen((prev) => !prev);
            }}
          >
            <Bell className='h-5 w-5' />
            {unreadCount > 0 && (
              <span className='absolute top-1.5 right-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white'>
                {unreadCount}
              </span>
            )}
          </button>
          {isNotificationOpen && (
            <div className='absolute right-0 top-12 w-80 rounded-2xl border border-gray-100 bg-white shadow-2xl'>
              <div className='flex items-center justify-between border-b border-gray-100 px-4 py-3'>
                <p className='text-sm font-semibold text-gray-900'>Notifications</p>
                <button
                  type='button'
                  className='text-xs font-medium text-blue-600 hover:underline'
                  onClick={() => {
                    markAllAsRead();
                  }}
                >
                  Mark all as read
                </button>
              </div>
              <div className='max-h-72 overflow-y-auto'>
                {notifications.length === 0 ? (
                  <p className='px-4 py-6 text-center text-sm text-gray-500'>You’re all caught up!</p>
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
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                        notif.read ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div>
                          <p className='text-sm font-semibold text-gray-900'>{notif.title}</p>
                          <p className='text-xs text-gray-500'>{notif.description}</p>
                        </div>
                        {notif.count > 1 && (
                          <span className='inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white'>
                            {notif.count}
                          </span>
                        )}
                      </div>
                      <span className='text-[11px] text-gray-400'>{notif.timeAgo}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className='space-y-1 text-right'>
          <p className='font-semibold text-sm text-gray-700'>{user?.name}</p>
          <p className='text-xs font-medium text-blue-600 uppercase tracking-wide'>{user?.role}</p>
        </div>

        <div className='relative' ref={dropdownRef}>
          <button
            type='button'
            onClick={toggleDropdown}
            className='flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full transition-transform duration-200 hover:scale-105'
            aria-haspopup='menu'
            aria-expanded={isDropdownOpen}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User avatar'}
                className='w-11 h-11 rounded-full object-cover border-2 border-gray-200 shadow-sm'
              />
            ) : (
              <CircleUserRoundIcon className='w-10 h-10 text-gray-500' />
            )}
          </button>
          {isDropdownOpen && (
            <div
              className='absolute top-14 right-0 bg-white rounded-md shadow-xl overflow-hidden min-w-[160px] border border-gray-100 z-40'
              role='menu'
            >
              <button
                type='button'
                className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3'
                onClick={onProfileClick}
                role='menuitem'
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <button
                type='button'
                className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3'
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                role='menuitem'
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
