import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { RoleProvider } from './context/RoleContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import DisclaimerBanner from './components/common/DisclaimerBanner';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage';
import InvestigationPage from './pages/InvestigationPage';
import AnomalyPage from './pages/AnomalyPage';
import MapPage from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MethodologyPage from './pages/MethodologyPage';
import MPConstituencyPage from './pages/MPConstituencyPage';
import MPCitizenReportsPage from './pages/MPCitizenReportsPage';
import AuthorityComplaintQueuePage from './pages/AuthorityComplaintQueuePage';
import CitizenReportPage from './pages/CitizenReportPage';
import CitizenTrackPage from './pages/CitizenTrackPage';

// System Administrator Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDatasetImportPage from './pages/admin/AdminDatasetImportPage';
import AdminDatasetHistoryPage from './pages/admin/AdminDatasetHistoryPage';
import AdminDataSourcesPage from './pages/admin/AdminDataSourcesPage';
import AdminSystemLogsPage from './pages/admin/AdminSystemLogsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminSystemHealthPage from './pages/admin/AdminSystemHealthPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminUserManagementPage from './pages/admin/AdminUserManagementPage';

export function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <Router>
          <ErrorBoundary>
            <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
              <Navbar />
              <DisclaimerBanner />
              <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                <Routes>
                  {/* Default Gateway & Authentication Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/login/:roleParam" element={<LoginPage />} />
                  <Route path="/overview" element={<OverviewPage />} />
                  
                  {/* MP Protected Routes */}
                  <Route 
                    path="/constituency" 
                    element={<ProtectedRoute allowedRoles={['mp']}><MPConstituencyPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/mp" 
                    element={<ProtectedRoute allowedRoles={['mp']}><MPConstituencyPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/mp/reports" 
                    element={<ProtectedRoute allowedRoles={['mp']}><MPCitizenReportsPage /></ProtectedRoute>} 
                  />
                  
                  {/* Authority Protected Routes */}
                  <Route 
                    path="/dashboard" 
                    element={<ProtectedRoute allowedRoles={['authority']}><DashboardPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/authority/reports" 
                    element={<ProtectedRoute allowedRoles={['authority']}><AuthorityComplaintQueuePage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/complaints" 
                    element={<ProtectedRoute allowedRoles={['authority']}><AuthorityComplaintQueuePage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/anomalies" 
                    element={<ProtectedRoute allowedRoles={['authority']}><AnomalyPage /></ProtectedRoute>} 
                  />
                  
                  {/* Citizen Routes */}
                  <Route path="/reports/new" element={<CitizenReportPage />} />
                  <Route path="/report" element={<CitizenReportPage />} />
                  <Route path="/reports/track" element={<CitizenTrackPage />} />
                  <Route path="/track" element={<CitizenTrackPage />} />

                  {/* Shared Explorer & Analytical Routes */}
                  <Route path="/projects" element={<ExplorerPage />} />
                  <Route path="/projects/:id" element={<InvestigationPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/methodology" element={<MethodologyPage />} />

                  {/* System Administrator Protected Platform Routes */}
                  <Route 
                    path="/admin" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDashboardPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/dashboard" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDashboardPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/users" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminUserManagementPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/access-management" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminUserManagementPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/datasets" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDatasetHistoryPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/datasets/import" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDatasetImportPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/datasets/history" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDatasetHistoryPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/data-sources" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminDataSourcesPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/system-logs" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminSystemLogsPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/audit-logs" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminAuditLogsPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/system-health" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminSystemHealthPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/settings" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminSettingsPage /></ProtectedRoute>} 
                  />
                  <Route 
                    path="/admin/configuration" 
                    element={<ProtectedRoute allowedRoles={['system_admin']}><AdminSettingsPage /></ProtectedRoute>} 
                  />

                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
        </Router>
      </RoleProvider>
    </LanguageProvider>
  );
}

export default App;
