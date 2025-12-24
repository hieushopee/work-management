import { Calendar, CheckSquare, ClipboardList, LayoutDashboard, MessageSquare, Users, DollarSign, FolderOpen, UserCheck, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../stores/useUserStore';
import { usePermissions } from '../hooks/usePermissions';
import axios from '../libs/axios';
import { getBannerUrls, BANNER_FILENAMES } from '../config/imagekit';
import BannerCarousel from '../components/BannerCarousel';

const moduleConfig = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Overview & Analytics',
    icon: LayoutDashboard,
    color: 'from-[#2b7fff] to-[#00b8db]',
    path: '/dashboard',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
  },
  {
    id: 'users',
    title: 'User Management',
    description: 'Employees & Accounts',
    icon: Users,
    color: 'from-[#ad46ff] to-[#f6339a]',
    path: '/employees',
    roles: ['admin', 'manager', 'owner'],
  },
  {
    id: 'tasks',
    title: 'Manage Tasks',
    description: 'Tasks & Projects',
    icon: CheckSquare,
    color: 'from-[#7c3aed] to-[#a855f7]',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
    pathByRole: {
      admin: '/tasks/analytics',
      manager: '/tasks/analytics',
      owner: '/tasks/analytics',
      staff: '/tasks',
      employee: '/tasks',
    },
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Chat & Communication',
    icon: MessageSquare,
    color: 'from-[#06b6d4] to-[#0891b2]',
    path: '/messages',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
  },
  {
    id: 'forms',
    title: 'Forms',
    description: 'Forms & Surveys',
    icon: ClipboardList,
    color: 'from-[#f59e0b] to-[#d97706]',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
    pathByRole: {
      admin: '/forms/all',
      manager: '/forms/all',
      owner: '/forms/all',
      staff: '/forms/my',
      employee: '/forms/my',
    },
  },
  {
    id: 'calendars',
    title: 'Calendars',
    description: 'Events & Schedules',
    icon: Calendar,
    color: 'from-[#3b82f6] to-[#2563eb]',
    path: '/calendar/manage/todo',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
  },
  {
    id: 'salary',
    title: 'Salary',
    description: 'Salary Management',
    icon: DollarSign,
    color: 'from-[#10b981] to-[#059669]',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
    pathByRole: {
      admin: '/salary/list',
      manager: '/salary/department',
      owner: '/salary/list',
      staff: '/salary/my',
      employee: '/salary/my',
    },
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Company Documents & Resources',
    icon: FolderOpen,
    color: 'from-[#f97316] to-[#ea580c]',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
    pathByRole: {
      admin: '/documents/statistics',
      manager: '/documents/statistics',
      owner: '/documents/statistics',
      staff: '/documents/view/personal',
      employee: '/documents/view/personal',
    },
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Check-ins & Shifts',
    icon: UserCheck,
    color: 'from-[#0ea5e9] to-[#2563eb]',
    path: '/attendance',
    roles: ['admin', 'manager', 'staff', 'employee', 'owner'],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Workspace & Preferences',
    icon: SlidersHorizontal,
    path: '/settings/user-permissions',
    color: 'from-[#475569] to-[#1f2937]',
    roles: ['admin', 'manager', 'owner'],
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { canAccessModule } = usePermissions();
  const [bannerImages, setBannerImages] = useState(['/banner-figma.png']); // Fallback image

  useEffect(() => {
    // Fetch banner images from ImageKit folder "New"
    const fetchBannerImages = async () => {
      try {
        // First, try to fetch banners directly from ImageKit API
        const bannersResponse = await axios.get('/auth/imagekit-banners');
        
        if (bannersResponse.data?.success && bannersResponse.data.banners?.length > 0) {
          setBannerImages(bannersResponse.data.banners);
          return;
        }

        // Fallback: Try to get banner URLs from config
        const configUrls = getBannerUrls();
        if (configUrls.length > 0) {
          setBannerImages(configUrls);
          return;
        }

        // Last fallback: Try to fetch from config API and build URLs manually
        const configResponse = await axios.get('/auth/imagekit-config');
        const { urlEndpoint } = configResponse.data || {};
        
        if (urlEndpoint) {
          // Build full URLs: urlEndpoint/New/filename for each banner
          const urls = BANNER_FILENAMES
            .filter(filename => filename && filename.trim())
            .map(filename => `${urlEndpoint}/New/${filename.trim()}`);
          
          if (urls.length > 0) {
            setBannerImages(urls);
          }
        }
      } catch (error) {
        console.error('Failed to fetch banner images:', error);
        // Keep fallback image
      }
    };

    fetchBannerImages();
  }, []);

  // Map module IDs to permission module names (moved outside useMemo to avoid dependency)
  const moduleIdToPermission = {
    'tasks': 'tasks',
    'forms': 'forms',
    'calendar': 'calendar',
    'messages': 'messages',
    'documents': 'documents',
    'attendance': 'attendance',
    'salary': 'salary',
    'users': 'employees',
    'settings': null, // Settings doesn't need permission check (admin only)
    'dashboard': null, // Dashboard is always accessible
  };

  const modules = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    return moduleConfig
      .filter((item) => {
        // Filter by role
        if (item.roles && !item.roles.includes(role)) return false;
        
        // Filter by permissions (admin, owner, and manager always have access to most modules)
        if (role === 'admin' || role === 'owner' || role === 'manager') {
          // Settings is only for admin/owner
          if (item.id === 'settings' && role !== 'admin' && role !== 'owner') {
            return false;
          }
          return true;
        }
        
        // For staff/employee: check permissions, but if no permissions exist, allow default access
        const permissionModule = moduleIdToPermission[item.id];
        if (permissionModule) {
          // If permissions are loaded and explicitly deny access, then deny
          // If permissions are not loaded yet or allow access, then allow
          const hasAccess = canAccessModule(permissionModule);
          // If permissions haven't loaded yet (loading state), allow default access
          // Only deny if permissions are explicitly set and deny access
          return hasAccess;
        }
        
        // Allow modules without permission mapping (like dashboard)
        return true;
      })
      .map((item) => {
        if (item.pathByRole) {
          const rolePath = item.pathByRole[role] || item.pathByRole.staff || item.path || '/';
          return { ...item, path: rolePath };
        }
        if (item.id === 'tasks' && !item.path) {
          return {
            ...item,
            path: role === 'staff' || role === 'employee' ? '/tasks' : '/tasks/analytics',
            description: 'My tasks & projects',
            title: 'Tasks',
          };
        }
        return item;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccessModule]);

  return (
    <div className='min-h-full min-w-0 w-full bg-white overflow-y-auto'>
      <div className='mx-auto max-w-7xl p-8'>
        <div className='overflow-hidden rounded-2xl bg-white shadow-soft-md border border-border-light mb-8'>
          <BannerCarousel images={bannerImages} autoPlayInterval={5000} />
        </div>

        <div className='text-center mb-12'>
          <h1 className='text-3xl font-semibold text-text-main mb-2'>Welcome to Internal Management System</h1>
          <p className='text-sm text-text-secondary'>Select a module to get started with your work</p>
        </div>

        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-soft-md'>
              <LayoutDashboard className='h-6 w-6' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-text-main'>Main Modules</h2>
              <p className='text-sm text-text-secondary'>Access all system features</p>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {modules.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className='group relative w-full rounded-3xl border border-border-light bg-white p-6 text-center shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                  type='button'
                >
                  <div className='absolute -inset-1 bg-primary rounded-3xl opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-300' />
                  
                  <div className='relative flex flex-col items-center'>
                    <div className='mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-soft-md group-hover:scale-110 group-hover:shadow-soft-lg transition-all duration-300'>
                      <Icon className='h-10 w-10' strokeWidth={2} />
                  </div>
                    <h3 className='text-base font-semibold text-text-main mb-1'>{item.title}</h3>
                    <p className='text-sm text-text-secondary'>{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
