import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { RoleProvider } from './context/RoleContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import DisclaimerBanner from './components/common/DisclaimerBanner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
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
                  {/* Public / Overview Routes */}
                  <Route path="/" element={<OverviewPage />} />
                  <Route path="/landing" element={<LandingPage />} />
                  
                  {/* MP Routes */}
                  <Route path="/constituency" element={<MPConstituencyPage />} />
                  <Route path="/mp" element={<MPConstituencyPage />} />
                  <Route path="/mp/reports" element={<MPCitizenReportsPage />} />
                  
                  {/* Authority Routes */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/authority/reports" element={<AuthorityComplaintQueuePage />} />
                  <Route path="/complaints" element={<AuthorityComplaintQueuePage />} />
                  <Route path="/anomalies" element={<AnomalyPage />} />
                  
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

                  {/* System Administrator Platform Routes */}
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/datasets" element={<AdminDatasetHistoryPage />} />
                  <Route path="/admin/datasets/import" element={<AdminDatasetImportPage />} />
                  <Route path="/admin/datasets/history" element={<AdminDatasetHistoryPage />} />
                  <Route path="/admin/data-sources" element={<AdminDataSourcesPage />} />
                  <Route path="/admin/system-logs" element={<AdminSystemLogsPage />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="/admin/system-health" element={<AdminSystemHealthPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/configuration" element={<AdminSettingsPage />} />
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
