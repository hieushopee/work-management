import { useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SIDEBAR_EMPLOYEE_ITEMS, SIDEBAR_OWNER_ITEMS } from '../constants/sideBar.jsx'
import useUserStore from '../stores/useUserStore'

const SideBar = ({ className, isCollapsed: collapsedProp, defaultCollapsed = false, onCollapsedChange }) => {
    const { pathname } = useLocation()
    const { user } = useUserStore()
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
    const isControlled = typeof collapsedProp === 'boolean'
    const isCollapsed = isControlled ? collapsedProp : internalCollapsed

    const sidebarItems = user?.role === 'owner' ? SIDEBAR_OWNER_ITEMS : SIDEBAR_EMPLOYEE_ITEMS

    const isActiveItem = (itemPath) => {
        if (itemPath === '/') {
            return pathname === '/'
        }
        return pathname.startsWith(itemPath)
    }

    const toggleSidebar = () => {
        const nextCollapsed = !isCollapsed
        if (!isControlled) {
            setInternalCollapsed(nextCollapsed)
        }
        onCollapsedChange?.(nextCollapsed)
    }

    return (
        <div className={`fixed top-20 left-0 z-20 bg-white ${isCollapsed ? 'w-16' : 'w-64'} h-[calc(100vh-80px)] flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out ${className}`}>
            <div className={`flex-1 ${isCollapsed ? 'px-2 py-3' : 'p-4'}`}>
                <div className="space-y-3">
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
                                isActive ? 'text-white' : 'text-gray-700'
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
                                            flex items-center h-12 ${isCollapsed ? 'justify-center w-12 mx-auto' : 'w-full px-4'} rounded-xl transition-all duration-300 ease-in-out
                                            ${isActive
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            flex-shrink-0 transition-colors duration-200
                                            ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}
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
                                        <div className="absolute top-1/2 left-full translate-x-3 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                            {item.name}
                                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    }
                </div>
            </div>

            <div className={`flex-shrink-0 ${isCollapsed ? 'px-2 py-3' : 'p-4'} border-t border-gray-100 bg-white`}>
                <button
                    onClick={toggleSidebar}
                    className={`
                        flex items-center ${isCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 h-12 px-4 w-full justify-center'} rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all duration-300 ease-in-out group
                    `}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? (
                        <ChevronsRight className='w-5 h-5 transition-transform duration-300 ease-in-out group-hover:translate-x-1' />
                    ) : (
                        <>
                            <ChevronsLeft className='w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-translate-x-1' />
                            <span className="font-medium transition-opacity duration-300 ease-in-out">Hide Sidebar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default SideBar
