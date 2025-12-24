import { Outlet } from 'react-router-dom';
import SalaryModuleSidebar from '../../components/SalaryModuleSidebar';

const SalaryManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <SalaryModuleSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default SalaryManagementLayout;



