import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { SocketProvider } from './hooks/useSocket';
import LoginPage from './pages/auth/LoginPage'
import { useUserStore } from './stores/useUserStore'
import LoadingSpinner from './components/LoadingSpinner'
import VerificationPage from './pages/auth/VerificationPage'
import ManageEmployeePage from './pages/owner/ManageEmployeePage'
import DepartmentManagementPage from './pages/owner/DepartmentManagementPage';
import TeamManagementPage from './pages/owner/TeamManagementPage';
import AccountManagementPage from './pages/user/AccountManagementPage';
import ManageTaskPage from './pages/owner/ManageTaskPage'
import MessagePage from './features/chat/pages/MessagePage'
import ProfilePage from './pages/employee/ProfilePage';
import TaskPage from './pages/employee/TaskPage';
import Layout from './pages/Layout';
import FormPage from './pages/FormPage';
import CalendarPage from "./pages/CalendarPage";
import ReportPage from "./pages/ReportPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import AttendanceManagementLayout from "./pages/attendance/AttendanceManagementLayout";
import CheckinCheckoutPage from "./pages/attendance/CheckinCheckoutPage";
import AttendanceHistoryPage from "./pages/attendance/HistoryPage";
import MyShiftsPage from "./pages/attendance/MyShiftsPage";
import AttendanceReportsPage from "./pages/attendance/ReportsPage";
import FormsPage from "./pages/attendance/FormsPage";
import SummaryOverviewPage from "./pages/attendance/SummaryOverviewPage";
import SummaryDetailPage from "./pages/attendance/SummaryDetailPage";
import ShiftsPage from "./pages/attendance/ShiftsPage";
import ShiftAssignmentPage from "./pages/attendance/ShiftAssignmentPage";
import DevicesPage from "./pages/attendance/DevicesPage";
import LocationsPage from "./pages/attendance/LocationsPage";
import LocationAssignmentPage from "./pages/attendance/LocationAssignmentPage";
import RulesPage from "./pages/attendance/RulesPage";
import EmployeeManagementLayout from './pages/owner/EmployeeManagementLayout';
import DocumentManagementLayout from "./pages/documents/DocumentManagementLayout";
import StatisticsPage from "./pages/documents/StatisticsPage";
import ViewDocumentsPage from "./pages/documents/ViewDocumentsPage";
import ManageDocumentsPage from "./pages/documents/ManageDocumentsPage";
import ReviewDocumentsPage from "./pages/documents/ReviewDocumentsPage";
import SubmitDocumentPage from "./pages/documents/SubmitDocumentPage";
import FormManagementLayout from "./pages/form/FormManagementLayout";
import MyFormsPage from "./pages/form/MyFormsPage";
import MyResponsesPage from "./pages/form/MyResponsesPage";
import AllFormsPage from "./pages/form/AllFormsPage";
import TaskManagementLayout from "./pages/task/TaskManagementLayout";
import TaskListView from "./pages/task/TaskListView";
import MyChecklistPage from "./pages/task/MyChecklistPage";
import ChecklistPage from "./pages/task/ChecklistPage";
import TaskAnalytics from "./pages/task/TaskAnalytics";
import SalaryManagementLayout from "./pages/salary/SalaryManagementLayout";
import MySalaryPage from "./pages/salary/MySalaryPage";
import SalaryListPage from "./pages/salary/SalaryListPage";
import DepartmentSalariesPage from "./pages/salary/DepartmentSalariesPage";
import CompanySalariesPage from "./pages/salary/CompanySalariesPage";
import SalaryAdjustmentRequestsPage from "./pages/salary/SalaryAdjustmentRequestsPage";
import ManagerProposalsPage from "./pages/salary/ManagerProposalsPage";
import BaseSalarySettingsPage from "./pages/salary/BaseSalarySettingsPage";
import SalarySettingsPage from "./pages/salary/SalarySettingsPage";
import StaffReportsPage from "./pages/salary/StaffReportsPage";
import CalendarManagementLayout from "./pages/calendar/CalendarManagementLayout";
import ToDoListPage from "./pages/calendar/ToDoListPage";
import WorkHoursPage from "./pages/calendar/WorkHoursPage";
import CalendarReportPage from "./pages/calendar/ReportPage";
import MessageManagementLayout from "./pages/message/MessageManagementLayout";
import InboxPage from "./pages/message/InboxPage";
import GroupChatPage from "./pages/message/GroupChatPage";
import ChatAIPage from "./pages/message/ChatAIPage";
import SettingsManagementLayout from "./pages/settings/SettingsManagementLayout";
import UserPermissionsPage from "./pages/settings/UserPermissionsPage";
import DepartmentPermissionsPage from "./pages/settings/DepartmentPermissionsPage";
import WorkspaceSettingsPage from "./pages/settings/WorkspaceSettingsPage";
import CreateWorkspacePage from "./pages/workspace/CreateWorkspacePage";
import RegisterAdminPage from "./pages/workspace/RegisterAdminPage";

// Redirect component for legacy /message/:userId route
const MessageRedirect = () => {
  const { userId } = useParams();
  return <Navigate to={userId ? `/messages/inbox/${userId}` : '/messages'} replace />;
};

function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { email } = useLocation().state || {};

  const { checkAuth, checkingAuth, user } = useUserStore()
  const role = (user?.role || '').toLowerCase();
  const canManageUsers = role === 'admin' || role === 'manager' || role === 'owner';
  const isAdminRole = role === 'admin';

useEffect(() => {
  checkAuth();
}, []);

  useEffect(() => {
    // Don't redirect if on public routes
    const publicRoutes = ["/login", "/verify", "/create-workspace", "/register-admin", "/forgot-password"];
    if (!checkingAuth && !user && !publicRoutes.includes(pathname) && !email) {
      navigate("/login");
    }
  }, [user, checkingAuth, pathname]);

  if (checkingAuth) {
    return <LoadingSpinner />
  }

  return (
    <div className='font-sans'>
      <SocketProvider>
        <Routes>
          <Route path="/create-workspace" element={user ? <Navigate to="/" /> : <CreateWorkspacePage />} />
          <Route path="/register-admin" element={user ? <Navigate to="/" /> : <RegisterAdminPage />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/verify" element={user ? <Navigate to="/" /> : <VerificationPage />} />
          <Route path='/' element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/employees/*"
              element={canManageUsers ? <EmployeeManagementLayout /> : <Navigate to="/" replace />}
            >
              <Route index element={<ManageEmployeePage />} />
              <Route path="profiles" element={<ManageEmployeePage />} />
              <Route path="departments" element={<DepartmentManagementPage />} />
              <Route path="teams" element={<TeamManagementPage />} />
              <Route
                path="accounts"
                element={isAdminRole ? <AccountManagementPage /> : <Navigate to="/employees" replace />}
              />
            </Route>
            <Route
              path="/manage-task/*"
              element={
                ['admin', 'manager', 'owner'].includes(role)
                  ? <Navigate to="/tasks/analytics" replace />
                  : ['staff', 'employee'].includes(role)
                  ? <Navigate to="/tasks" replace />
                  : <Navigate to="/" replace />
              }
            />
            {/* Legacy redirects - redirect old /message routes to new /messages routes */}
            <Route path="/message/:userId" element={<MessageRedirect />} />
            <Route path="/message" element={<Navigate to="/messages" replace />} />
            {/* Legacy redirects - redirect old /form routes to new /forms routes */}
            <Route path="/form" element={<Navigate to="/forms" replace />} />
            <Route path="form" element={<Navigate to="/forms" replace />} />
            {/* Legacy redirects - redirect /calendar to /calendar/manage/work-hours */}
            <Route path="/calendar" element={<Navigate to="/calendar/manage/work-hours" replace />} />
            <Route path="/calendar/todo" element={<Navigate to="/calendar/manage/todo" replace />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Form Module */}
            <Route path="/forms/*" element={<FormManagementLayout />}>
              <Route index element={<Navigate to="/forms/my" replace />} />
              <Route path="my" element={<MyFormsPage />} />
              <Route path="responses" element={<MyResponsesPage />} />
              <Route path="all" element={<AllFormsPage />} />
            </Route>

            {/* Task Module */}
            <Route path="/tasks/*" element={<TaskManagementLayout />}>
              <Route index element={<TaskListView />} />
              <Route
                path="board"
                element={
                  role === "admin" || role === "manager" || role === "owner"
                    ? <ManageTaskPage />
                    : <Navigate to="/tasks" replace />
                }
              />
              <Route path="checklists" element={<ChecklistPage />} />
              <Route path="my-checklist" element={<MyChecklistPage />} />
              <Route path="analytics" element={<TaskAnalytics />} />
              <Route path="manage" element={role === "admin" || role === "manager" || role === "owner" ? <ManageTaskPage /> : <Navigate to="/tasks" replace />} />
            </Route>

            {/* Salary Module */}
            <Route path="/salary/*" element={<SalaryManagementLayout />}>
              <Route index element={<MySalaryPage />} />
              <Route path="my" element={<MySalaryPage />} />
              <Route path="list" element={<SalaryListPage />} />
              <Route path="department" element={<DepartmentSalariesPage />} />
              <Route path="company" element={<CompanySalariesPage />} />
              <Route path="adjustments" element={<SalaryAdjustmentRequestsPage />} />
              <Route path="proposals" element={<ManagerProposalsPage />} />
              <Route path="base-settings" element={<BaseSalarySettingsPage />} />
              <Route path="settings" element={<SalarySettingsPage />} />
              <Route path="staff-reports" element={<StaffReportsPage />} />
            </Route>

            {/* Calendar Module */}
            <Route path="/calendar/manage/*" element={<CalendarManagementLayout />}>
              <Route index element={<WorkHoursPage />} />
              <Route path="todo" element={<ToDoListPage />} />
              <Route path="work-hours" element={<WorkHoursPage />} />
              <Route path="report" element={<CalendarReportPage />} />
            </Route>

            {/* Message Module */}
            <Route path="/messages/*" element={<MessageManagementLayout />}>
              <Route index element={<InboxPage />} />
              <Route path="inbox/:userId" element={<InboxPage />} />
              <Route path="groups" element={<GroupChatPage />} />
              <Route path="group/:groupId" element={<GroupChatPage />} />
              <Route path="ai" element={<ChatAIPage />} />
            </Route>
            
            {/* Document Module Routes */}
            <Route path="/documents/*" element={<DocumentManagementLayout />}>
              <Route index element={<Navigate to="/documents/view/company" replace />} />
              <Route path="statistics" element={role === "admin" || role === "manager" || role === "owner" ? <StatisticsPage /> : <Navigate to="/documents" replace />} />
              <Route path="view/company" element={<ViewDocumentsPage docType="company" />} />
              <Route path="view/personal" element={<ViewDocumentsPage docType="personal" />} />
              <Route path="manage" element={role === "admin" || role === "manager" || role === "owner" ? <ManageDocumentsPage /> : <Navigate to="/documents" replace />} />
              <Route path="review" element={role === "admin" || role === "manager" || role === "owner" ? <ReviewDocumentsPage /> : <Navigate to="/documents" replace />} />
              <Route path="submit" element={<SubmitDocumentPage />} />
            </Route>
            
            {/* Attendance Module Routes */}
            <Route path="/attendance" element={<AttendanceManagementLayout />}>
              <Route index element={<CheckinCheckoutPage />} />
              <Route path="checkin" element={<CheckinCheckoutPage />} />
              <Route path="history" element={<AttendanceHistoryPage />} />
              <Route path="my-shifts" element={<MyShiftsPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="reports" element={<AttendanceReportsPage />} />
              <Route path="summary/overview" element={user?.role === "admin" || user?.role === "manager" ? <SummaryOverviewPage /> : <Navigate to="/attendance" />} />
              <Route path="summary/detail" element={user?.role === "admin" || user?.role === "manager" ? <SummaryDetailPage /> : <Navigate to="/attendance" />} />
              <Route path="shifts" element={user?.role === "admin" || user?.role === "manager" ? <ShiftsPage /> : <Navigate to="/attendance" />} />
              <Route path="shift-assignment" element={user?.role === "admin" || user?.role === "manager" ? <ShiftAssignmentPage /> : <Navigate to="/attendance" />} />
              <Route path="devices" element={user?.role === "admin" || user?.role === "manager" ? <DevicesPage /> : <Navigate to="/attendance" />} />
              <Route path="locations" element={user?.role === "admin" || user?.role === "manager" ? <LocationsPage /> : <Navigate to="/attendance" />} />
              <Route path="location-assignment" element={user?.role === "admin" || user?.role === "manager" ? <LocationAssignmentPage /> : <Navigate to="/attendance" />} />
              <Route path="rules" element={user?.role === "admin" || user?.role === "manager" ? <RulesPage /> : <Navigate to="/attendance" />} />
            </Route>
            
            {/* Settings Module Routes */}
            <Route path="/settings/*" element={<SettingsManagementLayout />}>
              <Route index element={<Navigate to="/settings/workspace" replace />} />
              <Route path="workspace" element={<WorkspaceSettingsPage />} />
              <Route path="user-permissions" element={<UserPermissionsPage />} />
              <Route path="department-permissions" element={<DepartmentPermissionsPage />} />
            </Route>
            
            <Route path='*' element={<Navigate to="/" />} />
          </Route>
        </Routes>

        <Toaster />
      </SocketProvider>
    </div>
  )
}

export default App
