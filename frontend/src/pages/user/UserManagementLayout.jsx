import { Outlet } from 'react-router-dom';
import UserModuleSidebar from '../../components/UserModuleSidebar';

const UserManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
      <UserModuleSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto p-8 bg-bg-secondary">
        <Outlet />
      </main>
    </div>
  );
};

export default UserManagementLayout;
