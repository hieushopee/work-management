import { Outlet } from 'react-router-dom';
import MessageModuleSidebar from '../../components/MessageModuleSidebar';

const MessageManagementLayout = () => {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <MessageModuleSidebar />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default MessageManagementLayout;

