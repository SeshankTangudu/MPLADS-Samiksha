import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCog,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Landmark,
  Building2,
  Eye,
  MoreVertical,
  Edit3,
  Sliders,
  ChevronRight,
  X,
  FileText,
  Check,
  UserX,
  AlertCircle
} from 'lucide-react';
import { UserManagementAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';
import { useLanguage } from '../../i18n/LanguageContext';

export const AdminUserManagementPage = () => {
  const { t } = useLanguage();

  // Data state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [kpiCounts, setKpiCounts] = useState({ total_users: 0, active_count: 0, suspended_count: 0, disabled_count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Drawer state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerUser, setDrawerUser] = useState(null);
  const [userAccessHistory, setUserAccessHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states
  const [statusForm, setStatusForm] = useState({ status: 'SUSPENDED', reason: '' });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '', reason: '' });
  const [scopeForm, setScopeForm] = useState({ state: '', district: '', constituency: '', office_name: '', authority_type: 'District Authority', lok_sabha_term: 18, reason: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    role: 'authority',
    username: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    state: 'Uttar Pradesh',
    district: '',
    constituency: '',
    authority_type: 'District Authority',
    office_name: '',
    jurisdiction: '',
    lok_sabha_term: 18,
    phone: '',
    status: 'ACTIVE',
  });

  const fetchUsers = async (page = 1) => {
    try {
      setRefreshing(true);
      const params = {
        page,
        page_size: pagination.page_size,
        search: searchQuery.trim() || undefined,
        role: selectedRole || undefined,
        status: selectedStatus || undefined,
      };
      const res = await UserManagementAPI.getUsers(params);
      const data = res.data || res;
      setUsers(data.items || []);
      setPagination({
        page: data.page,
        page_size: data.page_size,
        total: data.total,
        total_pages: data.total_pages,
      });
      setKpiCounts({
        total_users: data.total_users || 0,
        active_count: data.active_count || 0,
        suspended_count: data.suspended_count || 0,
        disabled_count: data.disabled_count || 0,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load user accounts:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [selectedRole, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // Open Drawer with detailed profile & access history
  const handleOpenDrawer = async (user) => {
    try {
      setSelectedUser(user);
      setDrawerUser(user);
      setLoadingHistory(true);
      const [detailRes, historyRes] = await Promise.all([
        UserManagementAPI.getUserById(user.id),
        UserManagementAPI.getUserAccessHistory(user.id),
      ]);
      setDrawerUser(detailRes.data || detailRes);
      setUserAccessHistory(historyRes.data || historyRes || []);
    } catch (err) {
      console.error('Failed to fetch user details or access history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle User Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (createForm.password !== createForm.confirm_password) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (createForm.role === 'authority' && !createForm.district.trim()) {
      setError('District is mandatory for District Authority accounts.');
      return;
    }

    if (createForm.role === 'mp' && !createForm.constituency.trim()) {
      setError('Constituency is mandatory for MP accounts.');
      return;
    }

    try {
      setSubmittingAction(true);
      const payload = {
        username: createForm.username.trim(),
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        password: createForm.password,
        email: createForm.email.trim() || undefined,
        state: createForm.state.trim() || undefined,
        district: createForm.district.trim() || undefined,
        constituency: createForm.constituency.trim() || undefined,
        authority_type: createForm.authority_type,
        office_name: createForm.office_name.trim() || undefined,
        jurisdiction: createForm.jurisdiction.trim() || undefined,
        lok_sabha_term: createForm.role === 'mp' ? Number(createForm.lok_sabha_term) : undefined,
        phone: createForm.phone.trim() || undefined,
        status: createForm.status,
      };

      const res = await UserManagementAPI.createUser(payload);
      const newUser = res.data || res;
      setSuccessMessage(`Account '${newUser.username}' (${newUser.display_id}) created successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        role: 'authority',
        username: '',
        full_name: '',
        email: '',
        password: '',
        confirm_password: '',
        state: 'Uttar Pradesh',
        district: '',
        constituency: '',
        authority_type: 'District Authority',
        office_name: '',
        jurisdiction: '',
        lok_sabha_term: 18,
        phone: '',
        status: 'ACTIVE',
      });
      fetchUsers(1);
    } catch (err) {
      console.error('Account creation failed:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create account.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Status Update (Suspend, Reactivate, Disable)
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusForm.reason.trim() || statusForm.reason.trim().length < 5) {
      setError('A justification reason of at least 5 characters is required.');
      return;
    }

    try {
      setSubmittingAction(true);
      await UserManagementAPI.updateUserStatus(selectedUser.id, {
        status: statusForm.status,
        reason: statusForm.reason.trim(),
      });
      setSuccessMessage(`Account status for '${selectedUser.username}' updated to ${statusForm.status}.`);
      setShowStatusModal(false);
      setStatusForm({ status: 'SUSPENDED', reason: '' });
      fetchUsers(pagination.page);
    } catch (err) {
      console.error('Failed to update user status:', err);
      setError(err.response?.data?.detail || err.message || 'Status transition failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Password Reset
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (!passwordForm.reason.trim() || passwordForm.reason.trim().length < 5) {
      setError('A mandatory reason is required for administrative password resets.');
      return;
    }

    try {
      setSubmittingAction(true);
      await UserManagementAPI.resetPassword(selectedUser.id, {
        new_password: passwordForm.new_password,
        reason: passwordForm.reason.trim(),
      });
      setSuccessMessage(`Password reset successfully for user '${selectedUser.username}'.`);
      setShowPasswordModal(false);
      setPasswordForm({ new_password: '', confirm_password: '', reason: '' });
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.response?.data?.detail || err.message || 'Password reset failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Scope Update
  const handleScopeSubmit = async (e) => {
    e.preventDefault();
    if (!scopeForm.reason.trim() || scopeForm.reason.trim().length < 5) {
      setError('A mandatory justification reason is required for scope reassignment.');
      return;
    }

    try {
      setSubmittingAction(true);
      await UserManagementAPI.updateUserScope(selectedUser.id, {
        state: scopeForm.state.trim() || undefined,
        district: scopeForm.district.trim() || undefined,
        constituency: scopeForm.constituency.trim() || undefined,
        office_name: scopeForm.office_name.trim() || undefined,
        authority_type: scopeForm.authority_type,
        lok_sabha_term: scopeForm.lok_sabha_term ? Number(scopeForm.lok_sabha_term) : undefined,
        reason: scopeForm.reason.trim(),
      });
      setSuccessMessage(`Access scope reassigned successfully for user '${selectedUser.username}'.`);
      setShowScopeModal(false);
      fetchUsers(pagination.page);
    } catch (err) {
      console.error('Failed to update scope:', err);
      setError(err.response?.data?.detail || err.message || 'Scope update failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'system_admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">System Admin</span>;
      case 'authority':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">District Authority</span>;
      case 'mp':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">MP</span>;
      case 'citizen':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Citizen</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ACTIVE
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            SUSPENDED
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <UserX className="w-3 h-3 text-rose-600" />
            DISABLED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="py-12">
        <LoadingState message="Loading Identity & User Directory..." />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-purple-600">Platform Operations</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-700">Identity & Credential Management</span>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
            <UserCog className="w-3.5 h-3.5" />
            <span>Identity Governance & RBAC Lifecycle</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">User & Access Management</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Provision verified platform accounts across Citizen, MP, and District Authority roles. Enforce server-side boundary isolation, account lifecycle states (Active, Suspended, Disabled), and cryptographic credentials.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchUsers(pagination.page)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Directory'}</span>
          </button>
          <button
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Account</span>
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-indigo-600 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Managed Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{kpiCounts.total_users}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Platform user registry entries</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Across Citizen, MP, Authority & Admin
          </div>
        </div>

        {/* Active Accounts */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{kpiCounts.active_count}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Authorized for immediate access</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Full operational privilege active
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspended Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">{kpiCounts.suspended_count}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Temporary administrative holds</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Blocked at login until reactivated
          </div>
        </div>

        {/* Disabled Accounts */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disabled Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">{kpiCounts.disabled_count}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Permanent / deboarded accounts</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            History preserved; login prohibited
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4 bg-white space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username, full name, display ID, constituency, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="">All Roles</option>
              <option value="citizen">Citizen</option>
              <option value="mp">Member of Parliament (MP)</option>
              <option value="authority">District Authority</option>
              <option value="system_admin">System Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </form>

        {(searchQuery || selectedRole || selectedStatus) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Active Filters:</span>
            {searchQuery && <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">"{searchQuery}"</span>}
            {selectedRole && <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">Role: {selectedRole}</span>}
            {selectedStatus && <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">Status: {selectedStatus}</span>}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('');
                setSelectedStatus('');
                fetchUsers(1);
              }}
              className="text-indigo-600 hover:underline font-semibold ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* User Accounts Table */}
      <div className="gov-card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Identity & Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Access Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <UserCog className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No user accounts found matching current query.</p>
                    <p className="text-[11px] mt-1">Try resetting filters or provision a new user account.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {user.display_id || `USR-${user.id.toString().padStart(3, '0')}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{user.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                      {user.email && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{user.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.role === 'authority' ? (
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span>{user.district || 'All Districts (Nodal)'}</span>
                        </div>
                      ) : user.role === 'mp' ? (
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Landmark className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>{user.constituency || 'Unassigned'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{user.district || user.state || 'Public Scope'}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {user.created_at?.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {user.last_login ? (
                        <span className="text-[11px] font-mono text-emerald-700">
                          {user.last_login.slice(0, 10)} {user.last_login.slice(11, 16)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Never logged in</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Details Drawer */}
                        <button
                          onClick={() => handleOpenDrawer(user)}
                          title="View Profile & Access History"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setPasswordForm({ new_password: '', confirm_password: '', reason: '' });
                            setError(null);
                            setShowPasswordModal(true);
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Edit Scope */}
                        {user.role !== 'system_admin' && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setScopeForm({
                                state: user.state || '',
                                district: user.district || '',
                                constituency: user.constituency || '',
                                office_name: '',
                                authority_type: 'District Authority',
                                lok_sabha_term: 18,
                                reason: '',
                              });
                              setError(null);
                              setShowScopeModal(true);
                            }}
                            title="Reassign Scope Coordinates"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                        )}

                        {/* Status Change (Suspend / Reactivate / Disable) */}
                        {user.username !== 'sysadmin_platform' && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setStatusForm({
                                status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                reason: '',
                              });
                              setError(null);
                              setShowStatusModal(true);
                            }}
                            title="Change Account Status"
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.status === 'ACTIVE'
                                ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {users.length} of {pagination.total} accounts (Page {pagination.page} of {pagination.total_pages})
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CREATE ACCOUNT MODAL
         ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 p-6 space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                  <UserCog className="w-4 h-4" />
                  <span>Provision Account</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Create New Managed Account</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Account Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'authority', label: 'District Authority', desc: 'Verified record corrections' },
                    { id: 'mp', label: 'Member of Parliament', desc: 'Constituency monitoring' },
                    { id: 'citizen', label: 'Citizen User', desc: 'Public complaint filing' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, role: r.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        createForm.role === r.id
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nodal_agra_officer"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma, IAS"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="official.name@nic.in"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Role-Specific Scope Coordinates */}
              {createForm.role === 'authority' && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                  <div className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>District Authority Jurisdiction Scope</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        District Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Agra"
                        value={createForm.district}
                        onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Authority Level</label>
                      <select
                        value={createForm.authority_type}
                        onChange={(e) => setCreateForm({ ...createForm, authority_type: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="District Authority">District Authority</option>
                        <option value="Nodal Authority">District Nodal Authority</option>
                        <option value="Implementing Authority">Implementing Authority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Office Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Office of District Magistrate & Collector, Agra"
                      value={createForm.office_name}
                      onChange={(e) => setCreateForm({ ...createForm, office_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

              {createForm.role === 'mp' && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
                  <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-amber-700" />
                    <span>Parliamentary Constituency Scope</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Constituency Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lucknow"
                        value={createForm.constituency}
                        onChange={(e) => setCreateForm({ ...createForm, constituency: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Lok Sabha Term</label>
                      <select
                        value={createForm.lok_sabha_term}
                        onChange={(e) => setCreateForm({ ...createForm, lok_sabha_term: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value={18}>18th Lok Sabha (2024–Present)</option>
                        <option value={17}>17th Lok Sabha (2019–2024)</option>
                        <option value={16}>16th Lok Sabha (2014–2019)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {createForm.role === 'citizen' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span>Citizen Verification Coordinates</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Residence District</label>
                      <input
                        type="text"
                        placeholder="e.g. Varanasi"
                        value={createForm.district}
                        onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Contact</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={createForm.confirm_password}
                    onChange={(e) => setCreateForm({ ...createForm, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {submittingAction ? 'Provisioning Account...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATUS TRANSITION MODAL (SUSPEND / REACTIVATE / DISABLE)
         ========================================================================= */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Account State Transition</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Update Status for @{selectedUser.username}
                </h2>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Account Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Restore operational access)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary administrative hold)</option>
                  <option value="DISABLED">DISABLED (Permanent deboard; block login)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Justification Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Explain the official rationale for this account status transition..."
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
                <p className="text-[10px] text-slate-400 mt-1">
                  This reason is permanently recorded in technical platform system logs.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {submittingAction ? 'Transitioning...' : 'Confirm Status Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PASSWORD RESET MODAL
         ========================================================================= */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <Key className="w-4 h-4" />
                  <span>Credential Reset</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Reset Password for @{selectedUser.username}
                </h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrative Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. User requested credential renewal / security rotation..."
                  value={passwordForm.reason}
                  onChange={(e) => setPasswordForm({ ...passwordForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {submittingAction ? 'Updating Credentials...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          REASSIGN SCOPE MODAL
         ========================================================================= */}
      {showScopeModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Sliders className="w-4 h-4" />
                  <span>Jurisdiction Scope Reassignment</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Reassign Scope for @{selectedUser.username}
                </h2>
              </div>
              <button
                onClick={() => setShowScopeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScopeSubmit} className="space-y-3">
              {selectedUser.role === 'authority' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned District Jurisdiction <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={scopeForm.district}
                    onChange={(e) => setScopeForm({ ...scopeForm, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {selectedUser.role === 'mp' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Parliamentary Constituency <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={scopeForm.constituency}
                    onChange={(e) => setScopeForm({ ...scopeForm, constituency: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={scopeForm.state}
                  onChange={(e) => setScopeForm({ ...scopeForm, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justification Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="2"
                  placeholder="Official notification order number / transfer order reference..."
                  value={scopeForm.reason}
                  onChange={(e) => setScopeForm({ ...scopeForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScopeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {submittingAction ? 'Updating Scope...' : 'Reassign Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          USER DETAILS & ACCESS HISTORY SLIDE-OVER DRAWER
         ========================================================================= */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {drawerUser.display_id || `USR-${drawerUser.id}`}
                  </span>
                  {getStatusBadge(drawerUser.status)}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{drawerUser.full_name}</h2>
                <p className="text-xs text-slate-500 font-mono">@{drawerUser.username}</p>
              </div>
              <button
                onClick={() => setDrawerUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow text-xs">
              {/* Profile Details Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Account Specification
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px]">Role Designation</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{getRoleBadge(drawerUser.role)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Primary Email</span>
                    <div className="font-semibold text-slate-800 mt-0.5 truncate">{drawerUser.email || 'None'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Created At</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{drawerUser.created_at?.slice(0, 10)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Last Login</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{drawerUser.last_login?.slice(0, 16) || 'Never'}</div>
                  </div>
                </div>
              </div>

              {/* Scoped Coordinates */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <div className="font-bold text-indigo-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enforced Jurisdiction Boundary</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">State:</span>
                    <span className="font-bold text-slate-800">{drawerUser.state || 'National (All States)'}</span>
                  </div>
                  {drawerUser.role === 'authority' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">District Authority Scope:</span>
                        <span className="font-bold text-blue-700">{drawerUser.district || 'All Districts (Nodal)'}</span>
                      </div>
                      {drawerUser.authority_profile && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Authority Type:</span>
                            <span className="font-semibold text-slate-700">{drawerUser.authority_profile.authority_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Office Name:</span>
                            <span className="font-semibold text-slate-700 text-right max-w-[200px] truncate">{drawerUser.authority_profile.office_name}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {drawerUser.role === 'mp' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Constituency:</span>
                        <span className="font-bold text-amber-700">{drawerUser.constituency}</span>
                      </div>
                      {drawerUser.mp_profile && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lok Sabha Term:</span>
                          <span className="font-semibold text-slate-700">{drawerUser.mp_profile.lok_sabha_term}th Lok Sabha</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Access History & System Log Telemetry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Account Telemetry & Event History</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {userAccessHistory.length} events
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Loading access history...
                  </div>
                ) : userAccessHistory.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                    No recent telemetry records found for this account.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-slate-100">
                    {userAccessHistory.map((hist) => (
                      <div key={hist.id} className="pt-2 pb-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{hist.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{hist.timestamp?.slice(0, 16)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{hist.detail || hist.event_type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrawerUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagementPage;
