import React from 'react';
import { Outlet } from 'react-router-dom';
import CalendarModuleSidebar from '../../components/CalendarModuleSidebar';

const CalendarManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <CalendarModuleSidebar />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default CalendarManagementLayout;

