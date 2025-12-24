import { useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SIDEBAR_ADMIN_ITEMS, SIDEBAR_MANAGER_ITEMS, SIDEBAR_STAFF_ITEMS } from '../constants/sideBar.jsx'
import useUserStore from '../stores/useUserStore'
import { usePermissions } from '../hooks/usePermissions'

const SideBar = ({ className, isCollapsed: collapsedProp, defaultCollapsed = false, onCollapsedChange }) => {
    const { pathname } = useLocation()
    const { user } = useUserStore()
    const { canAccessModule } = usePermissions()
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
    const isControlled = typeof collapsedProp === 'boolean'
    const isCollapsed = isControlled ? collapsedProp : internalCollapsed

    // Map paths to module names for permission checking
    const pathToModule = {
        '/tasks': 'tasks',
        '/forms': 'forms',
        '/calendar': 'calendar',
        '/messages': 'messages',
        '/documents': 'documents',
        '/attendance': 'attendance',
        '/salary': 'salary',
        '/employees': 'employees',
    }

    // Get sidebar items based on role and filter by permissions
    const getSidebarItems = () => {
        const role = user?.role;
        let items = [];
        // Support legacy roles for backward compatibility
        if (role === 'admin' || role === 'owner') {
            items = SIDEBAR_ADMIN_ITEMS;
        } else if (role === 'manager') {
            items = SIDEBAR_MANAGER_ITEMS;
        } else {
            // Default to staff (includes 'staff' and legacy 'employee')
            items = SIDEBAR_STAFF_ITEMS;
        }

        // Filter items based on permissions (admin always has access)
        if (role !== 'admin' && role !== 'owner') {
            return items.filter(item => {
                // Home and Dashboard are always accessible
                if (item.path === '/' || item.path === '/dashboard') return true;
                
                // Check module permission
                const module = pathToModule[item.path];
                if (module) {
                    return canAccessModule(module);
                }
                return true; // Allow other items by default
            });
        }

        return items;
    };
    const sidebarItems = getSidebarItems()

    const isActiveItem = (itemPath) => {
        if (itemPath === '/') {
            return pathname === '/'
        }
        const parts = itemPath.split('/').filter(Boolean)
        const root = parts.length ? `/${parts[0]}` : itemPath
        return pathname === itemPath || pathname.startsWith(root)
    }

    const toggleSidebar = () => {
        const nextCollapsed = !isCollapsed
        if (!isControlled) {
            setInternalCollapsed(nextCollapsed)
        }
        onCollapsedChange?.(nextCollapsed)
    }

    return (
        <div className={`${isCollapsed ? 'w-16' : 'w-64'} h-full bg-white border-r border-border-light transition-all duration-300 ease-in-out ${className}`}>
            <div className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'p-4'}`}>
                <div className="space-y-2">
                    {
                        sidebarItems.map(item => {
                            const isActive = isActiveItem(item.path)
                            const textContainerClasses = [
                                'flex',
                                'items-center',
                                'overflow-hidden',
                                'transition-[flex-basis,opacity,transform,margin]',
                                'duration-300',
                                'ease-in-out',
                                isCollapsed ? 'flex-none basis-0 opacity-0 -translate-x-2 ml-0' : 'flex-1 basis-full opacity-100 translate-x-0 ml-3'
                            ].join(' ').trim()

                            const labelClasses = [
                                'font-medium',
                                'truncate',
                                'transition-colors',
                                'duration-300',
                                'ease-in-out',
                                isActive ? 'text-white' : 'text-text-main'
                            ].join(' ').trim()

                            const indicatorClasses = isCollapsed
                                ? 'hidden'
                                : [
                                    'ml-3',
                                    'w-2',
                                    'h-2',
                                    'bg-white',
                                    'rounded-full',
                                    'animate-pulse',
                                    'flex-shrink-0',
                                    'transition-all',
                                    'duration-300',
                                    'ease-in-out',
                                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                                ].join(' ').trim()
                            return (
                                <div key={item.name} className="relative group">
                                    <Link
                                        to={item.path}
                                        className={`
                                            flex items-center h-12 ${isCollapsed ? 'justify-center w-12 mx-auto' : 'w-full px-3'} rounded-xl transition-all duration-300 ease-in-out
                                            ${isActive
                                                ? 'bg-primary text-white shadow-soft'
                                                : 'text-text-main hover:bg-bg-hover'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            flex-shrink-0 transition-colors duration-200
                                            ${isActive ? 'text-white' : 'text-text-secondary'}
                                        `}>
                                            {item.icon}
                                        </div>
                                        <div className={textContainerClasses}>
                                            <span className={labelClasses}>
                                                {item.name}
                                            </span>
                                            <div className={indicatorClasses}></div>
                                        </div>
                                    </Link>
                                    {isCollapsed && (
                                        <div className="absolute top-1/2 left-full -translate-y-1/2 translate-x-3 rounded-lg bg-text-main px-3 py-2 text-sm text-white shadow-soft-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                            {item.name}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 h-2 w-2 rotate-45 bg-text-main"></div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    }
                </div>
            </div>

            <div className={`flex-shrink-0 ${isCollapsed ? 'px-2 py-3' : 'p-4'}`}>
                <button
                    onClick={toggleSidebar}
                    className={`
                        flex items-center ${isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 h-11 px-4 w-full justify-center'} rounded-2xl bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-primary transition-all duration-300 ease-in-out group focus:outline-none focus:ring-2 focus:ring-primary
                    `}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? (
                        <ChevronsRight className='h-5 w-5 transition-transform duration-300 ease-in-out group-hover:translate-x-1' />
                    ) : (
                        <>
                            <ChevronsLeft className='h-5 w-5 transition-transform duration-300 ease-in-out group-hover:-translate-x-1' />
                            <span className="font-medium transition-opacity duration-300 ease-in-out">Hide Sidebar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default SideBar
