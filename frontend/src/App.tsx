import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider }        from '@tanstack/react-query';
import { Toaster }           from 'react-hot-toast';
import LoginPage             from './pages/LoginPage';
import DashboardPage         from './pages/DashboardPage';
import ProjectsPage          from './pages/ProjectsPage';
import TasksPage             from './pages/TasksPage';
import WorkLogsPage          from './pages/WorkLogsPage';
import NotificationsPage     from './pages/NotificationsPage';
import UsersPage             from './pages/UsersPage';
import ReportsPage           from './pages/ReportsPage';
import ActivityLogPage       from './pages/ActivityLogPage';
import Layout                from './components/Layout';
import ProtectedRoute        from './components/ProtectedRoute';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard"     element={<DashboardPage />} />
                  <Route path="/projects"      element={
                    <ProtectedRoute roles={['admin','project_manager']}><ProjectsPage /></ProtectedRoute>
                  } />
                  <Route path="/tasks"         element={<TasksPage />} />
                  <Route path="/work-logs"     element={<WorkLogsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/reports"       element={
                    <ProtectedRoute roles={['admin','project_manager']}><ReportsPage /></ProtectedRoute>
                  } />
                  <Route path="/users"         element={
                    <ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>
                  } />
                  <Route path="/activity-log"  element={
                    <ProtectedRoute roles={['admin']}><ActivityLogPage /></ProtectedRoute>
                  } />
                  <Route path="*"              element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}