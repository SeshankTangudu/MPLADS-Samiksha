import React, { useState, useEffect } from 'react';
import { Layers, Database, ExternalLink, RefreshCw, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminDataSourcesPage = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getDataSources();
      setSources(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load data sources:', err);
      setError(err.message || 'Failed to retrieve registered data sources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 border border-purple-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Data Provenance & Registry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Registered Data Sources
          </h1>
          <p className="text-xs text-slate-600">
            Official government repositories, API feeds, and batch sources feeding the analytical database.
          </p>
        </div>

        <button
          onClick={fetchSources}
          className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Sources</span>
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading registered data source endpoints..." />
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((src) => (
            <div key={src.id} className="gov-card p-6 bg-white flex flex-col justify-between hover:shadow-md transition-shadow border-t-4 border-t-purple-600">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded uppercase">
                    {src.source_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {src.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{src.dataset_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{src.source_name}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed min-h-[2.5rem]">
                  {src.description || 'Official validated MPLADS scheme data feed.'}
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Record Count:</span>
                    <span className="font-bold text-slate-800">{src.record_count?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dataset Version:</span>
                    <span className="font-mono text-slate-800">v{src.dataset_version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Ingestion:</span>
                    <span className="text-slate-700">{src.last_ingestion?.slice(0, 10) || 'Initial Build'}</span>
                  </div>
                </div>
              </div>

              {src.source_url && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <a
                    href={src.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDataSourcesPage;
