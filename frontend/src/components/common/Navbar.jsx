import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  FileSearch,
  Server,
  UploadCloud,
  Clock,
  ShieldCheck,
  Terminal,
  FileCheck,
  Settings,
  LogOut,
  User,
  KeyRound,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES, ROLE_LABELS } from '../../context/RoleContext';
import LanguageSelector from './LanguageSelector';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { 
    viewRole, 
    currentUser, 
    isAuthenticated, 
    logoutUser, 
    selectedConstituency 
  } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  // Role-Aware Navigation Configuration
  const getNavItems = () => {
    if (!isAuthenticated) {
      return [
        { path: '/', key: 'nav.role_select', fallback: 'Role Selection', icon: LayoutGrid },
        { path: '/projects', key: 'nav.explorer', fallback: 'Explore Allocations', icon: Search },
        { path: '/map', key: 'nav.map', fallback: 'Map', icon: MapPin },
        { path: '/analytics', key: 'nav.analytics', fallback: 'Analytics', icon: BarChart3 },
        { path: '/methodology', key: 'nav.methodology', fallback: 'Methodology', icon: BookOpen },
        { path: '/reports/track', key: 'nav.reports_track', fallback: 'Track Report', icon: FileText },
      ];
    }

    switch (viewRole) {
      case ROLES.CITIZEN:
        return [
          { path: '/overview', key: 'nav.overview', fallback: 'Overview', icon: Layers },
          { path: '/projects', key: 'nav.explorer', fallback: 'Explore Allocations', icon: Search },
          { path: '/map', key: 'nav.map', fallback: 'Map', icon: MapPin },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Analytics', icon: BarChart3 },
          { path: '/methodology', key: 'nav.methodology', fallback: 'Methodology', icon: BookOpen },
          { path: '/reports/new', key: 'nav.reports_new', fallback: 'Submit Report', icon: FileText },
          { path: '/reports/track', key: 'nav.reports_track', fallback: 'Track Report', icon: Search },
        ];

      case ROLES.MP:
        return [
          { path: '/mp', key: 'nav.constituency', fallback: 'My Constituency', icon: Landmark },
          { path: '/projects', key: 'nav.explorer', fallback: 'My Allocations', icon: Search },
          { path: '/mp/reports', key: 'nav.citizen_reports', fallback: 'Citizen Reports', icon: FileText },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Risk & Trajectory', icon: TrendingUp },
          { path: '/methodology', key: 'nav.methodology', fallback: 'Peer Comparison', icon: Users },
        ];

      case ROLES.SYSTEM_ADMIN:
        return [
          { path: '/admin', key: 'nav.admin_dashboard', fallback: 'Ops Console', icon: Server },
          { path: '/admin/users', key: 'nav.admin_users', fallback: 'Users & Access', icon: UserCog },
          { path: '/admin/datasets/import', key: 'nav.admin_import', fallback: 'Dataset Ingestion', icon: UploadCloud },
          { path: '/admin/datasets/history', key: 'nav.admin_history', fallback: 'Ingestion Logs', icon: Clock },
          { path: '/admin/data-sources', key: 'nav.admin_sources', fallback: 'Data Sources', icon: Layers },
          { path: '/admin/system-health', key: 'nav.admin_health', fallback: 'Health Probes', icon: ShieldCheck },
          { path: '/admin/system-logs', key: 'nav.admin_syslogs', fallback: 'System Logs', icon: Terminal },
          { path: '/admin/audit-logs', key: 'nav.admin_audit', fallback: 'Audit Trail', icon: FileCheck },
          { path: '/admin/settings', key: 'nav.admin_settings', fallback: 'Platform Config', icon: Settings },
        ];

      case ROLES.AUTHORITY:
      default:
        return [
          { path: '/overview', key: 'nav.overview', fallback: 'Overview', icon: Layers },
          { path: '/dashboard', key: 'nav.dashboard', fallback: 'Review Dashboard', icon: BarChart3 },
          { path: '/authority/reports', key: 'nav.queue', fallback: 'Complaint Queue', icon: MessageSquareWarning },
          { path: '/anomalies', key: 'nav.anomalies', fallback: 'Anomaly Center', icon: AlertTriangle },
          { path: '/projects', key: 'common.investigate', fallback: 'Investigation', icon: FileSearch },
          { path: '/map', key: 'nav.map', fallback: 'Map', icon: MapPin },
          { path: '/analytics', key: 'nav.analytics', fallback: 'Analytics', icon: BarChart3 },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case ROLES.MP:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case ROLES.AUTHORITY:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case ROLES.SYSTEM_ADMIN:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case ROLES.CITIZEN:
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <header className="bg-gov-navy text-white shadow-md sticky top-0 z-50">
      {/* Top Government & Authentication Banner */}
      <div className="bg-gov-navyDark text-slate-300 text-xs py-1.5 px-4 border-b border-slate-700/50 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="truncate">{t('nav.top_banner', 'Government Oversight & Analytical Review Support Layer')}</span>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          {isAuthenticated && currentUser ? (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 hidden md:inline">Signed in as:</span>
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.full_name || currentUser.username}
              </span>
              
              {/* Role Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(currentUser.role)}`}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>

              {/* Scope Badge (Constituency or District) */}
              {currentUser.role === ROLES.MP && (currentUser.constituency || selectedConstituency) && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-200 border border-amber-700/50">
                  {currentUser.constituency || selectedConstituency}
                </span>
              )}
              {currentUser.role === ROLES.AUTHORITY && currentUser.district && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-900/40 text-emerald-200 border border-emerald-700/50">
                  District: {currentUser.district}
                </span>
              )}

              {/* Styled Logout Button */}
              <button
                id="header-logout-btn"
                onClick={handleLogout}
                className="ml-2 flex items-center space-x-1 px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/60 transition-colors text-[11px] font-semibold"
                title="End session and return to role selection"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/"
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                <span>Select Role / Sign In</span>
              </Link>
            </div>
          )}

          <div className="h-3 w-px bg-slate-700"></div>
          <LanguageSelector />
        </div>
      </div>

      {/* Main Navbar */}
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
            {navItems.map((item) => {
              const Icon = item.icon;
              const targetPath = item.query ? `${item.path}${item.query}` : item.path;
              const isActive = !item.query && (
                location.pathname === item.path || 
                (item.path !== '/' && item.path !== '/admin' && location.pathname.startsWith(item.path))
              );
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

            {/* If Authenticated, show Quick Switch Role shortcut linking to landing */}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="ml-2 flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-gov-navyLight/60 border border-slate-700/60 transition-colors"
                title="Sign out and switch role"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch Role</span>
              </button>
            )}
          </nav>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
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
        <div className="lg:hidden bg-gov-navyDark border-t border-slate-700/80 px-4 pt-2 pb-4 space-y-2">
          {isAuthenticated && currentUser && (
            <div className="p-3 bg-gov-navyLight/60 rounded-lg border border-slate-700 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{currentUser.full_name || currentUser.username}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getRoleBadgeStyle(currentUser.role)}`}>
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const targetPath = item.query ? `${item.path}${item.query}` : item.path;
              const isActive = !item.query && (
                location.pathname === item.path || 
                (item.path !== '/' && item.path !== '/admin' && location.pathname.startsWith(item.path))
              );
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
        </div>
      )}
    </header>
  );
};

export default Navbar;
