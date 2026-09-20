import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Users, 
  Landmark, 
  UserCog, 
  Server, 
  Lock, 
  User as UserIcon, 
  ArrowLeft, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useRole, ROLES, ROLE_LABELS } from '../context/RoleContext';
import { AuthAPI } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

const ROLE_THEMES = {
  [ROLES.CITIZEN]: {
    name: 'Citizen / Public',
    icon: Users,
    badge: 'Public View',
    primaryBg: 'bg-blue-600 hover:bg-blue-700',
    primaryBorder: 'border-blue-500',
    lightBg: 'bg-blue-50',
    accentText: 'text-blue-600',
    headerBadgeBg: 'bg-blue-100 text-blue-800',
    description: 'Explore verified constituency allocations, track indicators, and submit field observation reports.',
    demoUser: 'citizen_public',
    demoPass: 'Citizen@India2026',
    defaultRoute: '/projects',
  },
  [ROLES.MP]: {
    name: 'Member of Parliament (MP)',
    icon: Landmark,
    badge: 'Parliamentary Representative',
    primaryBg: 'bg-amber-500 hover:bg-amber-600 text-slate-950',
    primaryBorder: 'border-amber-400',
    lightBg: 'bg-amber-50',
    accentText: 'text-amber-600',
    headerBadgeBg: 'bg-amber-100 text-amber-900',
    description: 'Monitor your constituency portfolio, review risk signals, and submit official verification remarks.',
    demoUser: 'mp_varanasi',
    demoPass: 'MP@Varanasi2026',
    defaultRoute: '/mp',
  },
  [ROLES.AUTHORITY]: {
    name: 'District Authority & Auditor',
    icon: UserCog,
    badge: 'Official Data Authority',
    primaryBg: 'bg-emerald-700 hover:bg-emerald-800',
    primaryBorder: 'border-emerald-600',
    lightBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    headerBadgeBg: 'bg-emerald-100 text-emerald-900',
    description: 'Triage prioritized anomaly review queues, audit verified corrections, and resolve field complaints.',
    demoUser: 'authority_nodal',
    demoPass: 'Authority@Varanasi2026',
    defaultRoute: '/dashboard',
  },
  [ROLES.SYSTEM_ADMIN]: {
    name: 'System Administrator',
    icon: Server,
    badge: 'Platform Ops Authority',
    primaryBg: 'bg-purple-700 hover:bg-purple-800',
    primaryBorder: 'border-purple-600',
    lightBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    headerBadgeBg: 'bg-purple-100 text-purple-900',
    description: 'Manage platform accounts, dataset ingestion pipelines, health probes, and audit logging.',
    demoUser: 'sysadmin_platform',
    demoPass: 'Admin@Samiksha2026',
    defaultRoute: '/admin',
  },
};

export const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roleParam } = useParams();
  const { loginUser, isAuthenticated, currentUser } = useRole();
  const { t } = useLanguage();

  const queryParams = new URLSearchParams(location.search);
  const rawRole = roleParam || queryParams.get('role') || ROLES.CITIZEN;
  
  // Normalize role string
  let targetRole = ROLES.CITIZEN;
  if (rawRole === 'mp') targetRole = ROLES.MP;
  else if (rawRole === 'authority') targetRole = ROLES.AUTHORITY;
  else if (rawRole === 'admin' || rawRole === 'system_admin' || rawRole === 'sysadmin') targetRole = ROLES.SYSTEM_ADMIN;
  else if (rawRole === 'citizen') targetRole = ROLES.CITIZEN;

  const config = ROLE_THEMES[targetRole] || ROLE_THEMES[ROLES.CITIZEN];
  const IconComponent = config.icon;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // If already authenticated with this role, redirect directly to their dashboard
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role === targetRole) {
      const redirectUrl = queryParams.get('redirect') || config.defaultRoute;
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, currentUser, targetRole]);

  const handleAutofillDemo = () => {
    setUsername(config.demoUser);
    setPassword(config.demoPass);
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const authData = await AuthAPI.login({
        username: username.trim(),
        password: password,
        requested_role: targetRole,
      });

      if (authData && authData.token) {
        loginUser(authData);
        const redirectUrl = queryParams.get('redirect') || config.defaultRoute;
        navigate(redirectUrl, { replace: true });
      } else {
        setErrorMessage('Authentication response was invalid.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      const detail = err.message || (err.data && err.data.detail) || 'Authentication failed. Please verify your credentials.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-8 px-4">
      <div className="max-w-md w-full space-y-6">
        
        {/* Return to Role Selection Button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Role Selection</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Role Header Banner */}
          <div className={`p-6 ${config.lightBg} border-b border-slate-200`}>
            <div className="flex items-center space-x-3.5">
              <div className={`w-12 h-12 rounded-xl bg-white border ${config.primaryBorder} flex items-center justify-center ${config.accentText} shadow-sm flex-shrink-0`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${config.headerBadgeBg}`}>
                  {config.badge}
                </span>
                <h1 className="text-xl font-bold text-slate-900">
                  {config.name}
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-snug">
                  <div className="font-bold">Authentication Error</div>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Official ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`e.g. ${config.demoUser}`}
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Account Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs text-white shadow-md transition-all flex items-center justify-center space-x-2 ${config.primaryBg} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Authenticate & Enter Workspace</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="pt-3 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-gov-navy" />
                    Standard Evaluation Credentials:
                  </span>
                  <button
                    type="button"
                    onClick={handleAutofillDemo}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Auto-Fill
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 space-y-0.5">
                  <div>User: <span className="font-semibold text-slate-900">{config.demoUser}</span></div>
                  <div>Pass: <span className="font-semibold text-slate-900">{config.demoPass}</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Security & Audit Footer Note */}
        <p className="text-[11px] text-center text-slate-500 leading-relaxed max-w-sm mx-auto">
          Access is governed by role-based authorization. All session activities and authentication events are logged for security and compliance.
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
