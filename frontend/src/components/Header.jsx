import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleUserRoundIcon, LogOut, User } from "lucide-react";
import useUserStore from '../stores/useUserStore';

const Header = () => {
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { logout, user } = useUserStore()

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

  return (
    <div className='h-20 fixed top-0 left-0 z-30 w-full flex justify-between items-center px-6 bg-white border-b border-gray-200'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md'></div>
        <h1 className='text-xl font-bold text-gray-800 tracking-wider'>
          Employee Task Management
        </h1>
      </div>
      <div className='flex justify-end items-center gap-4'>
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