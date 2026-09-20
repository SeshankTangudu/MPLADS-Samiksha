import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Database, Server, RefreshCw, CheckCircle2, Cpu, HardDrive } from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminSystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      setRefreshing(true);
      const data = await AdminAPI.getSystemHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load system health:', err);
      setError(err.message || 'Failed to connect to health diagnostics probe.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="py-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Infrastructure Health Probes</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Health & Diagnostics
          </h1>
          <p className="text-xs text-slate-600">
            Live infrastructure diagnostics, database connectivity verification, table volume counts, and service uptime.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={refreshing}
          className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Probing...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Executing deep health probes..." />
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="gov-card p-5 bg-white border-l-4 border-l-emerald-500 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Master API Gateway</span>
              <div className="flex items-center gap-2 text-lg font-bold text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{health.api_status}</span>
              </div>
              <p className="text-[11px] text-slate-400">Port 8000 (FastAPI ASGI)</p>
            </div>

            <div className="gov-card p-5 bg-white border-l-4 border-l-emerald-500 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Database Engine</span>
              <div className="flex items-center gap-2 text-lg font-bold text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{health.database_status}</span>
              </div>
              <p className="text-[11px] text-slate-400">SQLite with WAL & FK Enforced</p>
            </div>

            <div className="gov-card p-5 bg-white border-l-4 border-l-purple-500 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Ingestion Engine</span>
              <div className="flex items-center gap-2 text-lg font-bold text-purple-700">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                <span>{health.ingestion_status}</span>
              </div>
              <p className="text-[11px] text-slate-400">18th LS Ready</p>
            </div>

            <div className="gov-card p-5 bg-white border-l-4 border-l-blue-500 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Authentication & RBAC</span>
              <div className="flex items-center gap-2 text-lg font-bold text-blue-700">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>{health.auth_status}</span>
              </div>
              <p className="text-[11px] text-slate-400">Least-Privilege Active</p>
            </div>
          </div>

          {/* Database Table Volume Telemetry */}
          <div className="gov-card p-6 bg-white space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <span>Master Database Entity Counts & Capacity</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {Object.entries(health.db_table_counts || {}).map(([tbl, cnt]) => (
                <div key={tbl} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-500 uppercase text-[10px] font-bold">{tbl.replace('_', ' ')}</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">{cnt.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Uptime and Timestamp Information */}
          <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>Uptime: {Math.round(health.uptime_seconds / 60)} minutes ({health.uptime_seconds}s)</span>
            <span>Last Probe Checked: {health.timestamp?.replace('T', ' ').slice(0, 19)} UTC</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemHealthPage;
