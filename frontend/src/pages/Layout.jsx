import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import SideBar from '../components/SideBar'

const Layout = () => {
  const location = useLocation()
  const path = location.pathname || '/'

  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem('isSidebarHidden') === 'true'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return localStorage.getItem('isSidebarCollapsed') === 'true'
  })

  useEffect(() => {
    const hideSideBar = () => {
      if (window.innerWidth <= 640 && !isSidebarHidden) {
        setIsSidebarHidden(true)
        localStorage.setItem('isSidebarHidden', 'true')
      }
    }

    window.addEventListener('resize', hideSideBar)

    return () => {
      window.removeEventListener('resize', hideSideBar)
    }
  }, [isSidebarHidden])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem('isSidebarCollapsed', isSidebarCollapsed ? 'true' : 'false')
  }, [isSidebarCollapsed])

  // Module views that have their own sidebars - hide main sidebar
  const isModuleView = 
    path.startsWith('/employees') || 
    path.startsWith('/tasks') || 
    path.startsWith('/forms') || 
    path.startsWith('/messages') || 
    path.startsWith('/message') ||  // Also handle /message (without 's')
    path.startsWith('/calendar/manage') || 
    path.startsWith('/calendar') ||  // Also handle /calendar (will redirect to /calendar/manage)
    path.startsWith('/salary') || 
    path.startsWith('/documents') || 
    path.startsWith('/attendance') ||
    path.startsWith('/manage-task') ||
    path.startsWith('/settings')
  
  // Only show main sidebar when NOT in module view and NOT on home/dashboard/profile
  const showMainSidebar = !isModuleView && path !== '/' && path !== '/dashboard' && path !== '/profile'

  const mainOffset = showMainSidebar
    ? isSidebarHidden
      ? 'ml-0'
      : isSidebarCollapsed
        ? 'ml-16'
        : 'ml-64'
    : 'ml-0'

  const contentWrapperClasses = 'flex-1 min-h-0 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar'

  return (
    <div className='h-screen bg-white flex flex-col overflow-x-hidden min-w-0 w-full max-w-full'>
      <Header />
      <div className="flex flex-1 overflow-hidden">
      {showMainSidebar && (
        <SideBar
          className={`transition-transform duration-300 ease-in-out ${isSidebarHidden ? '-translate-x-full' : 'translate-x-0'}`}
          isCollapsed={isSidebarCollapsed}
          onCollapsedChange={setIsSidebarCollapsed}
        />
      )}

        {isModuleView ? (
          <Outlet />
        ) : (
          <main className={`transition-all duration-300 ease-in-out ${mainOffset} flex flex-col flex-1 overflow-x-hidden w-full max-w-full min-w-0`}>
        <div className={contentWrapperClasses}>
          <Outlet />
        </div>
      </main>
        )}
      </div>
    </div>
  )
}

export default Layout
