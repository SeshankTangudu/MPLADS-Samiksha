import React, { useState, useEffect } from 'react';
import { Terminal, Filter, RefreshCw, Search, AlertCircle, ShieldAlert } from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminSystemLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityFilter, setSeverityFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (severityFilter) params.severity = severityFilter;
      if (moduleFilter) params.module = moduleFilter;
      const data = await AdminAPI.getSystemLogs(params);
      setLogs(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load system logs:', err);
      setError(err.message || 'Failed to retrieve technical platform logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, moduleFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.detail && l.detail.toLowerCase().includes(q)) ||
      (l.user_id && l.user_id.toLowerCase().includes(q)) ||
      l.log_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 border border-purple-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
            <Terminal className="w-3.5 h-3.5" />
            <span>Platform Telemetry & Diagnostics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Technical System Logs
          </h1>
          <p className="text-xs text-slate-600">
            Platform operations, authentication events, dataset validation, ingestion telemetry, and API diagnostics.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 bg-white flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, detail, user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Module:</span>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Modules</option>
            <option value="INGESTION">INGESTION</option>
            <option value="AUTH">AUTH</option>
            <option value="CONFIG">CONFIG</option>
            <option value="API">API</option>
            <option value="PLATFORM">PLATFORM</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading platform system logs..." />
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="gov-card p-12 bg-white text-center text-xs text-slate-400 space-y-2">
          <Terminal className="w-8 h-8 mx-auto text-slate-300" />
          <p>No technical system log records matching the selected filters.</p>
        </div>
      ) : (
        <div className="gov-card bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs font-mono">
              <thead className="bg-slate-50 font-sans font-semibold text-slate-700 text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp (UTC)</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Module</th>
                  <th className="px-4 py-3 text-left">Action & Summary</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Log ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50 text-[11px]">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {log.timestamp?.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'CRITICAL' || log.severity === 'ERROR' ? 'bg-red-100 text-red-700' :
                        log.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-purple-700 font-semibold uppercase">{log.module}</td>
                    <td className="px-4 py-2.5 font-sans">
                      <div className="font-semibold text-slate-900">{log.action}</div>
                      {log.detail && <div className="text-slate-500 text-[11px] mt-0.5">{log.detail}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{log.user_id || 'system'}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px]">{log.log_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemLogsPage;
