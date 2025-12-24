import { Outlet } from 'react-router-dom';
import UserModuleSidebar from '../../components/UserModuleSidebar';

const EmployeeManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <UserModuleSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeManagementLayout;
