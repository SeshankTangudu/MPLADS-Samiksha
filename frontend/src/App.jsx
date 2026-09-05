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
                  <Route path="/" element={<OverviewPage />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/constituency" element={<MPConstituencyPage />} />
                  <Route path="/mp" element={<MPConstituencyPage />} />
                  <Route path="/mp/reports" element={<MPCitizenReportsPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/authority/reports" element={<AuthorityComplaintQueuePage />} />
                  <Route path="/complaints" element={<AuthorityComplaintQueuePage />} />
                  <Route path="/projects" element={<ExplorerPage />} />
                  <Route path="/projects/:id" element={<InvestigationPage />} />
                  <Route path="/anomalies" element={<AnomalyPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/methodology" element={<MethodologyPage />} />
                  <Route path="/reports/new" element={<CitizenReportPage />} />
                  <Route path="/report" element={<CitizenReportPage />} />
                  <Route path="/reports/track" element={<CitizenTrackPage />} />
                  <Route path="/track" element={<CitizenTrackPage />} />
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
