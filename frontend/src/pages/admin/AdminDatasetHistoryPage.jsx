import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  RefreshCw, 
  FileText,
  Eye,
  X
} from 'lucide-react';
import { AdminAPI } from '../../services/api';
import LoadingState from '../../components/common/LoadingState';

export const AdminDatasetHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getDatasetHistory({ limit: 50 });
      setHistory(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load dataset history:', err);
      setError(err.message || 'Failed to retrieve dataset ingestion logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-700 border border-purple-500/30 px-3 py-0.5 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Provenance & Ingestion Logs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dataset Ingestion History
          </h1>
          <p className="text-xs text-slate-600">
            Chronological, immutable audit records of all batch and live data pipeline ingestion jobs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/datasets/import"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>New Ingestion</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading ingestion execution records..." />
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="gov-card p-12 bg-white text-center space-y-3">
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Ingestion Records Found</h3>
          <p className="text-xs text-slate-500">No external dataset import jobs have been executed yet.</p>
          <Link to="/admin/datasets/import" className="gov-btn-primary text-xs inline-flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4" /> Import First Dataset
          </Link>
        </div>
      ) : (
        <div className="gov-card bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700 text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">Import ID</th>
                  <th className="px-4 py-3 text-left">Dataset Name</th>
                  <th className="px-4 py-3 text-left">Source & Term</th>
                  <th className="px-4 py-3 text-left">Uploaded By</th>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-right">Rows</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.map((item) => (
                  <tr key={item.import_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-purple-700">{item.import_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.dataset_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.source} {item.lok_sabha_term ? `(${item.lok_sabha_term}th LS)` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{item.uploaded_by}</td>
                    <td className="px-4 py-3 text-slate-500">{item.uploaded_at?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className="text-emerald-700 font-bold">{item.processed_rows.toLocaleString()}</span>
                      {item.rejected_rows > 0 && (
                        <span className="text-red-600 ml-1">(-{item.rejected_rows})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-purple-700"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Inspector for Details */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-purple-700 font-bold">{selectedItem.import_id}</span>
                <h3 className="text-sm font-bold text-slate-900">{selectedItem.dataset_name}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-400">Source:</span> <span className="font-semibold text-slate-800">{selectedItem.source}</span></div>
              <div><span className="text-slate-400">Term:</span> <span className="font-semibold text-slate-800">{selectedItem.lok_sabha_term}th Lok Sabha</span></div>
              <div><span className="text-slate-400">Filename:</span> <span className="font-mono text-slate-800">{selectedItem.filename}</span></div>
              <div><span className="text-slate-400">Duration:</span> <span className="font-semibold text-slate-800">{selectedItem.duration_seconds}s</span></div>
              <div><span className="text-slate-400">Total Rows:</span> <span className="font-semibold text-slate-800">{selectedItem.total_rows.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Processed:</span> <span className="font-bold text-emerald-700">{selectedItem.processed_rows.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Rejected:</span> <span className="font-bold text-red-600">{selectedItem.rejected_rows.toLocaleString()}</span></div>
              <div><span className="text-slate-400">Duplicates:</span> <span className="font-bold text-amber-600">{selectedItem.duplicate_rows.toLocaleString()}</span></div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDatasetHistoryPage;
