import React from "react";
import { Outlet } from "react-router-dom";
import AttendanceModuleSidebar from "../../components/AttendanceModuleSidebar";

const AttendanceManagementLayout = () => {
  return (
    <div className="flex h-full w-full bg-[#1a1a2e]">
      <AttendanceModuleSidebar />
      <main className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AttendanceManagementLayout;
