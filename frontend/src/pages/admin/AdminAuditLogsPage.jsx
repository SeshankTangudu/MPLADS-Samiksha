import React, { useState, useEffect } from 'react';
import { FileCheck, ShieldCheck, RefreshCw, Search, ShieldAlert, Lock } from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (entityFilter) params.entity_type = entityFilter;
      const data = await AdminAPI.getAuditLogs(params);
      setLogs(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to retrieve official audit trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [entityFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.entity_id.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q) ||
      l.actor_id.toLowerCase().includes(q) ||
      l.field_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Append-Only Accountability Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Official Data Audit Logs
          </h1>
          <p className="text-xs text-slate-600">
            Immutable official record corrections, status updates, and verification decisions recorded by authorized District Authorities.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Append-Only Immutability Notice */}
      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Cryptographically & Functionally Append-Only:</span>
          <p className="text-emerald-800 text-[11px]">
            This official audit log is append-only. Neither System Administrators nor any other role has permission to alter, delete, or overwrite historical audit entries.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="gov-card p-4 bg-white flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search record ID, reason, actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Entity Type:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="PROJECT">Project Allocations</option>
            <option value="COMPLAINT">Citizen Complaints</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading official audit history..." />
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="gov-card p-12 bg-white text-center text-xs text-slate-400 space-y-2">
          <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
          <p>No official record correction audit entries recorded yet.</p>
        </div>
      ) : (
        <div className="gov-card bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs font-sans">
              <thead className="bg-slate-50 font-semibold text-slate-700 text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">Audit ID & Time</th>
                  <th className="px-4 py-3 text-left">Entity & Action</th>
                  <th className="px-4 py-3 text-left">Field Changed</th>
                  <th className="px-4 py-3 text-left">Old Value → New Value</th>
                  <th className="px-4 py-3 text-left">Reason & Evidence</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-slate-50 text-[11px]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-emerald-800">{log.audit_id}</div>
                      <div className="text-slate-400 text-[10px]">{log.timestamp?.replace('T', ' ').slice(0, 16)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.entity_id}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-purple-700 font-semibold">{log.field_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] space-y-0.5">
                        <span className="text-red-700 line-through mr-1.5">{log.old_value || 'None'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-bold ml-1.5">{log.new_value || 'None'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-slate-800 font-medium">{log.reason}</div>
                      {log.evidence_id && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {log.evidence_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{log.actor_id}</div>
                      <div className="text-[10px] text-emerald-600 uppercase font-bold">{log.actor_role}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                      v{log.record_version}
                    </td>
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

export default AdminAuditLogsPage;
