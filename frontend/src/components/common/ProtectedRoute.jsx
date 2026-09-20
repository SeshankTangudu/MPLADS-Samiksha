import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { useRole, ROLE_LABELS } from '../../context/RoleContext';

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, currentUser, logoutUser } = useRole();
  const location = useLocation();

  if (!isAuthenticated) {
    const targetRole = allowedRoles.length > 0 ? allowedRoles[0] : 'citizen';
    return (
      <Navigate
        to={`/login?role=${encodeURIComponent(targetRole)}&redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    const userRoleLabel = ROLE_LABELS[currentUser?.role] || currentUser?.role || 'Unknown';
    const requiredRolesLabel = allowedRoles.map((r) => ROLE_LABELS[r] || r).join(' or ');

    const getWorkspacePath = (role) => {
      switch (role) {
        case 'mp':
          return '/mp';
        case 'authority':
          return '/dashboard';
        case 'system_admin':
          return '/admin';
        case 'citizen':
        default:
          return '/projects';
      }
    };

    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
          <div className="bg-red-500 text-white p-6 flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">403 — Access Denied</h2>
              <p className="text-xs text-red-100 font-medium">Role-Based Security Boundary Enforced</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              Your account is authenticated as <span className="font-bold text-slate-900">{userRoleLabel}</span>.
              However, this workspace is strictly restricted to <span className="font-bold text-red-700">{requiredRolesLabel}</span> personnel.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated Identity:</span>
                <span className="font-semibold text-slate-800">{currentUser?.full_name || currentUser?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-semibold text-slate-800">{userRoleLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Role:</span>
                <span className="font-semibold text-red-700">{requiredRolesLabel}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to={getWorkspacePath(currentUser?.role)}
                className="flex-1 gov-btn-primary bg-gov-navy hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-lg text-center flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to My Workspace</span>
              </Link>
              <button
                onClick={logoutUser}
                className="gov-btn-secondary text-xs font-semibold py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
