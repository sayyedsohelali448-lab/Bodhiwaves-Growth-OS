import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { DepartmentsView } from './components/departments/DepartmentsView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ClientsView } from './components/clients/ClientsView';
import { CrmView } from './components/crm/CrmView';
import { TasksView } from './components/tasks/TasksView';
import { HrmsView } from './components/hrms/HrmsView';
import { LiveTrackingView } from './components/tracking/LiveTrackingView';
import { FinanceView } from './components/finance/FinanceView';
import { WhatsAppView } from './components/whatsapp/WhatsAppView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected ERP Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CommandCenter />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CrmView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ClientsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/departments"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DepartmentsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/hrms"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <HrmsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/live-tracking"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LiveTrackingView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TasksView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WhatsAppView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FinanceView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnalyticsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsView />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all 404 Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
