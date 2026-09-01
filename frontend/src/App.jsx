import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import DisclaimerBanner from './components/common/DisclaimerBanner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import OverviewPage from './pages/OverviewPage';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage';
import InvestigationPage from './pages/InvestigationPage';
import AnomalyPage from './pages/AnomalyPage';
import MapPage from './pages/MapPage';
import MethodologyPage from './pages/MethodologyPage';

export function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <DisclaimerBanner />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ExplorerPage />} />
              <Route path="/projects/:id" element={<InvestigationPage />} />
              <Route path="/anomalies" element={<AnomalyPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
