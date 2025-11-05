import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { SocketProvider } from './hooks/useSocket';
import LoginPage from './pages/auth/LoginPage'
import { useUserStore } from './stores/useUserStore'
import LoadingSpinner from './components/LoadingSpinner'
import VerificationPage from './pages/auth/VerificationPage'
import ManageEmployeePage from './pages/owner/ManageEmployeePage'
import ManageTaskPage from './pages/owner/ManageTaskPage'
import MessagePage from './features/chat/pages/MessagePage'
import ProfilePage from './pages/employee/ProfilePage';
import TaskPage from './pages/employee/TaskPage';
import Layout from './pages/Layout';
import FormPage from './pages/FormPage';
import CalendarPage from "./pages/CalendarPage";
import ReportPage from "./pages/ReportPage";

function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { email } = useLocation().state || {};

  const { checkAuth, checkingAuth, user } = useUserStore()

useEffect(() => {
  checkAuth();
}, []);

  useEffect(() => {
    if (!checkingAuth && !user && pathname !== "/login" && !email) navigate("/login")
  }, [user, checkingAuth]);

  if (checkingAuth) {
    return <LoadingSpinner />
  }

  return (
    <div className='font-sans'>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/verify" element={user ? <Navigate to="/" /> : <VerificationPage />} />
          <Route path='/' element={<Layout />}>
            <Route index element={user?.role === "owner" ? <ManageEmployeePage /> : <TaskPage />} />
            <Route path="/manage-task" element={user?.role === "owner" && <ManageTaskPage />} />
            <Route path="/message/:userId?" element={<MessagePage />} />
            <Route path="form" element={<FormPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path='*' element={<Navigate to="/" />} />
          </Route>
        </Routes>

        <Toaster />
      </SocketProvider>
    </div>
  )
}

export default App
