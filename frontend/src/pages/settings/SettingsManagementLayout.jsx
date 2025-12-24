import { Outlet, useLocation, Navigate } from 'react-router-dom';
import SettingsModuleSidebar from '../../components/SettingsModuleSidebar';
import useUserStore from '../../stores/useUserStore';
import { isAdmin } from '../../utils/roleUtils';
import { useEffect } from 'react';

const SettingsManagementLayout = () => {
  const { user } = useUserStore();
  const location = useLocation();

  // Redirect to first item when accessing /settings root
  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      // This will be handled by the route redirect in App.jsx
    }
  }, [location]);

  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <SettingsModuleSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default SettingsManagementLayout;


