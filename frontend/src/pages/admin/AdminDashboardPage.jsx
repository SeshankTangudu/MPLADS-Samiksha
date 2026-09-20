import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Activity, 
  Database, 
  UploadCloud, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight, 
  RefreshCw, 
  Settings, 
  Layers,
  Terminal,
  ShieldAlert,
  HardDrive,
  UserCog,
  Users
} from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';
import { useLanguage } from '../../i18n/LanguageContext';

export const AdminDashboardPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const data = await AdminAPI.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.message || 'Failed to connect to Platform Administration services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading Platform Operations & Health Console..." />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
            <Server className="w-3.5 h-3.5" />
            <span>Platform Administration Operations Console</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Administration</h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Technical operations management for MPLADS Samiksha. Governs data ingestion pipelines, official data source registration, live service health probes, and technical system telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Health'}</span>
          </button>
          <Link
            to="/admin/users"
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <UserCog className="w-4 h-4" />
            <span>Users & Access</span>
          </Link>
          <Link
            to="/admin/datasets/import"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Dataset</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Operations KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: System Health */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{stats?.system_health?.status || 'OPERATIONAL'}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>API: {stats?.system_health?.api_status}</span>
              <span>DB: {stats?.system_health?.database_status}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Uptime: {Math.round((stats?.system_health?.uptime_seconds || 0) / 60)} mins</span>
            <Link to="/admin/system-health" className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1">
              Probes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Total Allocations Ingested */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Master Allocations</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {stats?.total_allocations?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Across {stats?.total_districts || 0} districts & {stats?.total_mps || 0} MPs
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Terms: 15th, 16th, 17th, 18th</span>
            <Link to="/projects" className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
              Browse <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Data Sources */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-purple-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Repositories</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {stats?.total_datasets || 3} Sources
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              eSAKSHI & 18th LS Feeds Active
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Status: Ready</span>
            <Link to="/admin/data-sources" className="text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Ingestion Health */}
        <div className="gov-card p-5 bg-white border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingestion Telemetry</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {stats?.total_records_imported?.toLocaleString() || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total pipeline rows processed
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Failed Imports: {stats?.failed_imports_count || 0}</span>
            <Link to="/admin/datasets/history" className="text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1">
              History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Identity & Access Management Governance Card */}
      <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl shadow-md border border-indigo-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Identity & User Access Management</h2>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                RBAC Active
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              Provision District Authorities, MPs, and Citizens. Manage account statuses (Active, Suspended, Disabled), cryptographic password resets, and server-side jurisdiction scopes.
            </p>
          </div>
        </div>
        <Link
          to="/admin/users"
          className="px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 shadow transition-all whitespace-nowrap"
        >
          <span>Open User Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main 2-Column Content: Ingestions & Technical Event Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Recent Dataset Ingestion Events */}
        <div className="gov-card p-6 bg-white space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Dataset Ingestions</h2>
            </div>
            <Link to="/admin/datasets/history" className="text-xs text-purple-600 hover:underline font-semibold">
              View All Logs
            </Link>
          </div>

          {(!stats?.recent_ingestions || stats.recent_ingestions.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <UploadCloud className="w-8 h-8 mx-auto text-slate-300" />
              <p>No external dataset ingestion jobs have been run yet.</p>
              <Link to="/admin/datasets/import" className="text-purple-600 font-semibold hover:underline">
                Upload 18th Lok Sabha Dataset
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recent_ingestions.map((item) => (
                <div key={item.import_id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{item.dataset_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ID: {item.import_id} • {item.processed_rows.toLocaleString()} processed ({item.duration_seconds}s)
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 text-right">
                    {item.uploaded_at?.slice(0, 10)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Platform Technical Logs Feed */}
        <div className="gov-card p-6 bg-white space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">Technical System Logs</h2>
            </div>
            <Link to="/admin/system-logs" className="text-xs text-purple-600 hover:underline font-semibold">
              View All Logs
            </Link>
          </div>

          {(!stats?.recent_system_logs || stats.recent_system_logs.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <p>System operational with zero critical alerts.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 font-mono text-[11px]">
              {stats.recent_system_logs.map((log) => (
                <div key={log.log_id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 truncate">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        log.severity === 'CRITICAL' || log.severity === 'ERROR' ? 'bg-red-100 text-red-700' :
                        log.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.severity}
                      </span>
                      <span className="font-semibold text-slate-800">{log.action}</span>
                    </div>
                    <p className="text-slate-500 text-[10px] truncate">{log.detail || log.module}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 flex-shrink-0">
                    {log.timestamp?.slice(11, 19)} UTC
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Least Privilege Architecture Callout */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-purple-700 flex-shrink-0" />
          <div>
            <span className="font-bold">Least-Privilege RBAC Policy Active:</span>
            <p className="text-slate-600 text-[11px]">
              System Administrators operate technical infrastructure and dataset pipelines. Official operational record corrections and complaint resolutions are strictly reserved for verified District Authority officers.
            </p>
          </div>
        </div>
        <Link
          to="/admin/audit-logs"
          className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-semibold whitespace-nowrap"
        >
          Inspect Official Audit Trail
        </Link>
      </div>

    </div>
  );
};

export default AdminDashboardPage;
