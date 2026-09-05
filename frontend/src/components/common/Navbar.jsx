import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  BarChart3, 
  Search, 
  AlertTriangle, 
  MapPin, 
  BookOpen, 
  Layers, 
  Users, 
  Landmark, 
  UserCog, 
  LayoutGrid,
  Menu,
  X,
  FileText,
  TrendingUp,
  MessageSquareWarning,
  FileSearch
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import LanguageSelector from './LanguageSelector';
import RoleSelector from './RoleSelector';

export const Navbar = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { viewRole } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-Aware Navigation Configuration
  const getNavItems = () => {
    switch (viewRole) {
      case ROLES.CITIZEN:
        return [
          { path: '/', key: 'nav.overview', fallback: 'Home', icon: Layers },
          { path: '/projects', key: 'nav.explorer', fallback: 'Explore Allocations', icon: Search },
          { path: '/map', key: 'nav.map', fallback: 'Map', icon: MapPin },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Analytics', icon: BarChart3 },
          { path: '/methodology', key: 'nav.methodology', fallback: 'Methodology', icon: BookOpen },
          { path: '/reports/new', key: 'nav.reports_new', fallback: 'Report', icon: FileText },
          { path: '/reports/track', key: 'nav.reports_track', fallback: 'Track Report', icon: Search },
        ];

      case ROLES.MP:
        return [
          { path: '/', key: 'nav.constituency', fallback: 'My Constituency', icon: Landmark },
          { path: '/projects', key: 'nav.explorer', fallback: 'My Allocations', icon: Search },
          { path: '/mp/reports', key: 'nav.citizen_reports', fallback: 'Citizen Reports', icon: FileText },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Risk & Trajectory', icon: TrendingUp },
          { path: '/methodology', key: 'nav.methodology', fallback: 'Peer Comparison', icon: Users },
          { path: '/projects', key: 'common.investigate', fallback: 'Dossier', icon: FileText, query: '?view=dossier' },
        ];

      case ROLES.AUTHORITY:
      default:
        return [
          { path: '/', key: 'nav.overview', fallback: 'Overview', icon: Layers },
          { path: '/dashboard', key: 'nav.dashboard', fallback: 'Dashboard', icon: BarChart3 },
          { path: '/authority/reports', key: 'nav.queue', fallback: 'Complaint Queue', icon: MessageSquareWarning },
          { path: '/anomalies', key: 'nav.anomalies', fallback: 'Anomaly Center', icon: AlertTriangle },
          { path: '/projects', key: 'common.investigate', fallback: 'Investigation', icon: FileSearch },
          { path: '/map', key: 'nav.map', fallback: 'Map', icon: MapPin },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Analytics', icon: BarChart3 },
          { path: '/methodology', key: 'nav.methodology', fallback: 'Methodology', icon: BookOpen },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-gov-navy text-white shadow-md sticky top-0 z-50">
      {/* Top Government Banner */}
      <div className="bg-gov-navyDark text-slate-300 text-xs py-1 px-4 border-b border-slate-700/50 flex justify-between items-center">
        <span className="truncate pr-2">{t('nav.top_banner', 'Government Oversight & Analytical Review Support Layer')}</span>
        <div className="flex items-center space-x-3 flex-shrink-0">
          <RoleSelector />
          <LanguageSelector />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/30 transition-colors flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight flex items-center space-x-2">
                <span>{t('nav.title', 'MPLADS Samiksha')}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase font-semibold border border-amber-500/30">
                  {t('nav.intelligence', 'Intelligence')}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-normal hidden sm:block">
                {t('nav.tagline', 'Risk Intelligence & Review Decision Support')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link
              to="/landing"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 mr-2 transition-colors"
              title={t('roles.switch_role', 'Return to Role Selection Landing Experience')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('roles.switch_role', 'Roles')}</span>
            </Link>

            {navItems.map((item) => {
              const Icon = item.icon;
              const targetPath = item.query ? `${item.path}${item.query}` : item.path;
              const isActive = !item.query && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));
              const label = item.key ? t(item.key, item.fallback) : item.fallback;
              return (
                <Link
                  key={item.path + item.fallback}
                  to={targetPath}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gov-navyLight text-white shadow-sm font-bold'
                      : 'text-slate-200 hover:bg-gov-navyLight/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              to="/landing"
              className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40"
              title={t('roles.switch_role', 'Role Selection')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('roles.switch_role', 'Roles')}</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-gov-navyLight text-slate-200 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gov-navyDark border-t border-slate-700/80 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const targetPath = item.query ? `${item.path}${item.query}` : item.path;
            const isActive = !item.query && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));
            const label = item.key ? t(item.key, item.fallback) : item.fallback;
            return (
              <Link
                key={item.path + item.fallback}
                to={targetPath}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-gov-navyLight text-white font-bold'
                    : 'text-slate-200 hover:bg-gov-navyLight/50'
                }`}
              >
                <Icon className="w-4 h-4 text-amber-400" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Navbar;
