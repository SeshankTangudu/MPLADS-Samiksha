import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, BarChart3, Search, AlertTriangle, MapPin, BookOpen, Layers } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: Layers },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/projects', label: 'Project Explorer', icon: Search },
  { path: '/anomalies', label: 'Anomaly Center', icon: AlertTriangle },
  { path: '/map', label: 'Geographic Intelligence', icon: MapPin },
  { path: '/methodology', label: 'Methodology', icon: BookOpen },
];

export const Navbar = () => {
  const location = useLocation();

  return (
    <header className="bg-gov-navy text-white shadow-md sticky top-0 z-50">
      {/* Top Government Banner */}
      <div className="bg-gov-navyDark text-slate-300 text-xs py-1 px-4 border-b border-slate-700/50 flex justify-between items-center">
        <span>Government Oversight & Analytical Review Support Layer</span>
        <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Snapshot: MoSPI MPLADS</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/30 transition-colors">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight flex items-center space-x-2">
                <span>MPLADS Samiksha</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold border border-amber-500/30">Intelligence</span>
              </div>
              <p className="text-xs text-slate-300 font-normal">Risk Intelligence & Review Decision Support</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gov-navyLight text-white shadow-sm'
                      : 'text-slate-200 hover:bg-gov-navyLight/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
