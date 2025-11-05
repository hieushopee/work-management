import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import SideBar from '../components/SideBar'

const Layout = () => {
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

  const mainOffset = isSidebarHidden ? 'pl-0' : (isSidebarCollapsed ? 'pl-16' : 'pl-64')

  // Header is fixed with h-20 (~5rem). Make main take the remaining viewport height and scroll there.
  const mainClasses = `transition-all duration-300 ease-in-out ${mainOffset} flex flex-col h-[calc(100vh-5rem)] mt-20 overflow-hidden`
  const contentWrapperClasses = 'flex-1 flex flex-col overflow-hidden pb-6'

  return (
    <div className='h-screen overflow-hidden bg-white'>
      <Header />
      <SideBar
        className={`transition-transform duration-300 ease-in-out ${isSidebarHidden ? '-translate-x-full' : 'translate-x-0'}`}
        isCollapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      <main className={mainClasses}>
        <div className={contentWrapperClasses}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
