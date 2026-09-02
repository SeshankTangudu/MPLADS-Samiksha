import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ExternalLink,
  ShieldAlert,
  Info,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const AnomalyPage = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [minScore, setMinScore] = useState(25.0);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [selectedFlagType, setSelectedFlagType] = useState('');
  const [search, setSearch] = useState('');

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        min_score: minScore,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedRiskLevel) params.risk_level = selectedRiskLevel;
      if (selectedFlagType) params.flag_type = selectedFlagType;

      const response = await ProjectsAPI.getAnomalies(params);
      setAnomalies(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 0);
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
      setError(err.message || 'Failed to load prioritized anomaly queue.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, minScore, selectedRiskLevel, selectedFlagType, search]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedRiskLevel('');
    setSelectedFlagType('');
    setMinScore(25.0);
    setPage(1);
  };

  const getRiskBadge = (level, score) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return <span className="gov-badge-critical font-bold">Critical ({score})</span>;
      case 'high':
        return <span className="gov-badge-high font-bold">High Risk ({score})</span>;
      case 'medium':
        return <span className="gov-badge-medium font-semibold">Medium Risk ({score})</span>;
      default:
        return <span className="gov-badge-low">Low ({score})</span>;
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            Anomaly Intelligence Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized review queue of <strong>{total}</strong> allocations with analytical risk indicators requiring administrative inspection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reports/risk-summary.csv"
            download="mplads_risk_summary.csv"
            className="gov-btn-secondary text-xs flex items-center gap-1.5 shadow-sm bg-white"
            title="Download full CSV report of all allocations ranked by risk score"
          >
            <Download className="w-4 h-4 text-gov-navy" />
            Export Risk CSV
          </a>
        </div>
      </div>

      {/* Filter and Quick Tabs Card */}
      <div className="gov-card p-5 space-y-4">
        {/* Quick Tiers Filter Tabs */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Risk Tier:</span>
          <button
            onClick={() => { setSelectedRiskLevel(''); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedRiskLevel === '' ? 'bg-gov-navy text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Flagged (Score ≥ 25)
          </button>
          <button
            onClick={() => { setSelectedRiskLevel('High'); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedRiskLevel === 'High' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            High Risk (Score 50–74)
          </button>
          <button
            onClick={() => { setSelectedRiskLevel('Medium'); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              selectedRiskLevel === 'Medium' ? 'bg-yellow-600 text-white shadow-sm' : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
            }`}
          >
            Medium Risk (Score 25–49)
          </button>
        </div>

        {/* Search & Secondary Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by MP, district, constituency, or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="gov-input pl-9 w-full text-xs"
            />
          </div>

          <div>
            <select
              value={selectedFlagType}
              onChange={(e) => { setSelectedFlagType(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-2"
            >
              <option value="">All Signal Types</option>
              <option value="FINANCIAL">Financial Deviation (P90)</option>
              <option value="TIMELINE">Timeline Stagnation</option>
              <option value="DATA_QUALITY">Data Quality / Audit Remark</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="gov-btn-secondary text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Prioritized Anomaly Table */}
      <div className="gov-card overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Querying prioritized anomaly intelligence queue..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <p className="font-semibold text-sm">{error}</p>
            <button onClick={fetchAnomalies} className="gov-btn-primary text-xs">
              Retry Query
            </button>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">No allocations meet the selected anomaly filter criteria.</p>
            <p className="text-xs text-slate-400">All evaluated allocations within this view satisfy normal cohort baselines.</p>
            <button onClick={handleResetFilters} className="gov-btn-secondary text-xs mt-2">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Rank & ID</th>
                  <th>Member of Parliament</th>
                  <th>Constituency / State</th>
                  <th>Civic Category</th>
                  <th className="text-center">Risk Assessment</th>
                  <th className="text-right">Reported Spent / Budget</th>
                  <th>Financial Utilization</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, idx) => {
                  const rank = (page - 1) * limit + idx + 1;
                  const util = a.financial_utilization || 0;
                  return (
                    <tr key={a.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="font-mono text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            #{rank}
                          </span>
                          <span className="font-semibold text-slate-800">{a.source_record_id}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block ml-7">
                          {a.lok_sabha_term}th Lok Sabha
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-slate-900 block">{a.mp_name}</span>
                        <span className="text-[11px] text-slate-500">{a.house}</span>
                      </td>
                      <td>
                        <span className="text-slate-800 font-medium block">{a.constituency || a.district}</span>
                        <span className="text-[11px] text-slate-500">{a.state}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {a.category}
                        </span>
                      </td>
                      <td className="text-center">
                        {getRiskBadge(a.risk_level, a.total_score)}
                      </td>
                      <td className="text-right">
                        <span className="font-bold text-gov-navy block">₹{a.expenditure.toFixed(2)} Cr</span>
                        <span className="text-[11px] text-slate-500 block">Sanctioned: ₹{a.sanctioned_cost.toFixed(2)} Cr</span>
                      </td>
                      <td>
                        <div className="space-y-1 w-24">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                            <span>{util.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                util >= 90 ? 'bg-emerald-500' : util >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, util)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <Link
                          to={`/projects/${a.source_record_id}`}
                          className="gov-btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 shadow-sm"
                          title="Deep investigation and explainable breakdown"
                        >
                          Investigate <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && total > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Showing prioritized rank <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> anomalies</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="gov-btn-secondary text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="gov-btn-secondary text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyPage;
