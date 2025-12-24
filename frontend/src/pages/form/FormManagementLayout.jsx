import { Outlet } from 'react-router-dom';
import FormModuleSidebar from '../../components/FormModuleSidebar';

const FormManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <FormModuleSidebar />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default FormManagementLayout;


