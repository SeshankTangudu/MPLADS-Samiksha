import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ExternalLink,
  Info,
  SlidersHorizontal,
  Building,
  Landmark,
  FileText
} from 'lucide-react';
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole } from '../context/RoleContext';

export const ExplorerPage = () => {
  const { t } = useLanguage();
  const { isMP, selectedConstituency } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedConstituencyFilter, setSelectedConstituencyFilter] = useState(() => {
    return searchParams.get('constituency') || (isMP ? selectedConstituency : '');
  });
  const [sortBy, setSortBy] = useState('expenditure');
  const [sortOrder, setSortOrder] = useState('desc');

  // Update filter when selectedConstituency changes if in MP mode
  useEffect(() => {
    if (isMP && selectedConstituency) {
      setSelectedConstituencyFilter(selectedConstituency);
      setPage(1);
    }
  }, [isMP, selectedConstituency]);

  // Phase 3.1: Multi-Allocation Comparison State
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  const toggleSelectForComparison = (p) => {
    if (selectedForComparison.some((item) => item.id === p.id)) {
      setSelectedForComparison(selectedForComparison.filter((item) => item.id !== p.id));
    } else {
      if (selectedForComparison.length >= 3) {
        alert('You can select a maximum of 3 allocations for comparison.');
        return;
      }
      setSelectedForComparison([...selectedForComparison, p]);
    }
  };

  const clearComparison = () => {
    setSelectedForComparison([]);
    setShowComparisonModal(false);
  };

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedConstituencyFilter.trim()) params.constituency = selectedConstituencyFilter.trim();
      if (selectedState) params.state = selectedState;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedTerm) params.term = parseInt(selectedTerm, 10);

      const response = await ProjectsAPI.getProjects(params);
      setProjects(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 0);
    } catch (err) {
      console.error('Failed to fetch allocations:', err);
      setError(err.message || 'Failed to load allocation records. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedConstituencyFilter, selectedState, selectedCategory, selectedStatus, selectedTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedConstituencyFilter(isMP ? selectedConstituency : '');
    setSelectedState('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedTerm('');
    setSortBy('expenditure');
    setSortOrder('desc');
    setPage(1);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'gov-badge-low';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'allocated':
        return 'gov-badge-medium';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-gov-navy" />
            {t('explorer.title', 'Allocation Explorer')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('explorer.sub', 'Comprehensive database of 1,675 authentic parliamentary constituency allocations across India')}
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          {t('explorer.showing_results', 'Showing allocations')} <strong>{projects.length}</strong> {t('explorer.of', 'of')} <strong>{total.toLocaleString()}</strong>
        </div>
      </div>

      {/* MP Role Scoping Indicator */}
      {isMP && selectedConstituencyFilter && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-xs text-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>MP Scoped View:</strong> Displaying allocations scoped to <strong>{selectedConstituencyFilter}</strong> (Prototype UI-level filter).
            </span>
          </div>
          <button
            onClick={() => setSelectedConstituencyFilter('')}
            className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold underline whitespace-nowrap"
          >
            {t('common.all', 'Show All National Allocations')}
          </button>
        </div>
      )}

      {/* Search and Filters Card */}
      <div className="gov-card p-5 space-y-4">
        {/* Top Row: Search & Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('explorer.search_placeholder', 'Search by MP Name, Constituency, or Record ID...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="gov-input pl-9 w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleResetFilters}
              className="gov-btn-secondary text-xs flex items-center gap-1.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('common.reset', 'Reset Filters')}
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('common.category', 'Civic Category')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">{t('explorer.all_categories', 'All Categories')}</option>
              <option value="Infrastructure & Public Amenities">Infrastructure & Amenities</option>
              <option value="Community Development">{t('overview.cat_comm', 'Community Development')}</option>
              <option value="Rural & Urban Development">{t('overview.cat_rural', 'Rural & Urban Development')}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('common.term', 'Lok Sabha Term')}</label>
            <select
              value={selectedTerm}
              onChange={(e) => { setSelectedTerm(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">{t('explorer.all_terms', 'All Parliamentary Terms')}</option>
              <option value="17">17th Lok Sabha (2019–2024)</option>
              <option value="16">16th Lok Sabha (2014–2019)</option>
              <option value="15">15th Lok Sabha (2009–2014)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('common.status', 'Status')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">{t('common.all', 'All Lifecycle Statuses')}</option>
              <option value="Completed">{t('track.status_resolved', 'Completed')}</option>
              <option value="In Progress">{t('track.status_under_review', 'In Progress')}</option>
              <option value="Allocated">{t('track.status_registered', 'Allocated')}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('common.filter', 'Sort Metric')}</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="expenditure">{t('common.expenditure', 'Reported Expenditure')}</option>
              <option value="sanctioned_cost">{t('common.sanctioned', 'Sanctioned Budget')}</option>
              <option value="unspent_balance">{t('map.unspent_balance', 'Unspent Balance')}</option>
              <option value="sanction_date">{t('common.date', 'Sanction Date')}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('explorer.sort_order', 'Sort Order')}</label>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="desc">{t('explorer.sort_desc', 'Highest First (Desc)')}</option>
              <option value="asc">{t('explorer.sort_asc', 'Lowest First (Asc)')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="gov-card overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading allocation records from database..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <p className="font-semibold text-sm">{error}</p>
            <button onClick={fetchProjects} className="gov-btn-primary text-xs">
              Retry Query
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">{t('explorer.no_match', 'No allocation records match the specified filters.')}</p>
            <p className="text-xs text-slate-400">{t('explorer.adjust_filters', 'Try resetting filters or adjusting search parameters.')}</p>
            <button onClick={handleResetFilters} className="gov-btn-secondary text-xs mt-2">
              {t('common.reset', 'Reset Filters')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">{t('explorer.compare', 'Compare')}</th>
                  <th>{t('explorer.col_id', 'Record ID')}</th>
                  <th>{t('common.mp_name', 'Member of Parliament')}</th>
                  <th>Constituency / State</th>
                  <th>{t('common.category', 'Civic Category')}</th>
                  <th className="text-right">Sanctioned (₹ Cr)</th>
                  <th className="text-right">Reported Spent (₹ Cr)</th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      Financial Utilization
                      <span title="Proxy calculated as (expenditure / sanctioned_cost) * 100. Does not represent physical civil progress.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </span>
                    </span>
                  </th>
                  <th>{t('common.status', 'Status')}</th>
                  <th className="text-center">{t('common.actions', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const util = p.financial_utilization || 0;
                  const isSelected = selectedForComparison.some((item) => item.id === p.id);
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectForComparison(p)}
                          className="rounded border-slate-300 text-gov-navy focus:ring-gov-navy cursor-pointer"
                          title="Select for multi-allocation comparison"
                        />
                      </td>
                      <td className="font-mono text-xs font-semibold text-slate-700">
                        {p.source_record_id}
                        <span className="block text-[10px] text-slate-400 font-sans">
                          {p.lok_sabha_term}th Lok Sabha
                        </span>
                        {p.citizen_report_count > 0 && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-sans">
                            💬 {p.citizen_report_count} Report{p.citizen_report_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-slate-900 block">{p.mp_name}</span>
                        <span className="text-[11px] text-slate-500">{p.house}</span>
                      </td>
                      <td>
                        <span className="text-slate-800 font-medium block">{p.constituency || p.district}</span>
                        <span className="text-[11px] text-slate-500">{p.state}</span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {p.category}
                        </span>
                      </td>
                      <td className="text-right font-medium text-slate-800">
                        ₹{p.sanctioned_cost.toFixed(2)} Cr
                      </td>
                      <td className="text-right font-bold text-gov-navy">
                        ₹{p.expenditure.toFixed(2)} Cr
                      </td>
                      <td>
                        <div className="space-y-1 w-28">
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
                      <td>
                        <span className={`gov-badge ${getStatusBadgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/projects/${p.source_record_id}`}
                            className="inline-flex items-center text-xs font-semibold text-gov-navy hover:text-gov-navyLight p-1 rounded hover:bg-slate-100"
                            title="View allocation details and breakdown"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/reports/new?allocation=${p.source_record_id}`}
                            className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                            title="Report a Discrepancy on this allocation"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                        </div>
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
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="gov-input text-xs py-1 px-2"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
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

      {/* Phase 3.1: Sticky Comparison Dock */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white border border-slate-300 shadow-2xl rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 max-w-2xl w-11/12 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gov-navy text-white text-xs font-bold flex items-center justify-center">
              {selectedForComparison.length}
            </span>
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                {selectedForComparison.length === 1 ? '1 Allocation Selected' : `${selectedForComparison.length} Allocations Selected for Comparison`}
              </span>
              <span className="text-slate-500">
                {selectedForComparison.map((item) => item.source_record_id).join(', ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={clearComparison}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100"
            >
              Clear
            </button>
            <button
              disabled={selectedForComparison.length < 2}
              onClick={() => setShowComparisonModal(true)}
              className="gov-btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Compare Allocations ({selectedForComparison.length}/3)
            </button>
          </div>
        </div>
      )}

      {/* Phase 3.1: Multi-Allocation Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-gov-navy" />
                  Multi-Allocation Comparative Analysis (Phase 3.1)
                </h3>
                <p className="text-xs text-slate-500">
                  Side-by-side comparative inspection of {selectedForComparison.length} selected allocations
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="gov-table text-xs">
                <thead>
                  <tr>
                    <th className="w-44">Comparison Dimension</th>
                    {selectedForComparison.map((p) => (
                      <th key={p.id} className="text-left font-mono">
                        {p.source_record_id}
                        <span className="block text-[10px] font-sans text-slate-500 font-normal">
                          {p.lok_sabha_term}th Lok Sabha
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold text-slate-700">{t('common.mp_name', 'Member of Parliament')}</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id} className="font-bold text-slate-900">{p.mp_name}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">{t('common.constituency', 'Constituency & State')}</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id}>{p.constituency || p.district}, {p.state}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">Civic Sector Category</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id} className="font-medium text-gov-navy">{p.category}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">{t('common.sanctioned', 'Sanctioned Budget')}</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id} className="font-semibold">₹{p.sanctioned_cost.toFixed(2)} Cr</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">{t('common.expenditure', 'Reported Expenditure')}</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id} className="font-bold text-slate-900">₹{p.expenditure.toFixed(2)} Cr</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">{t('map.unspent_balance', 'Unspent Balance')}</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id}>₹{p.unspent_balance.toFixed(2)} Cr</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">Utilization Proxy</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id} className="font-bold">
                        {(p.financial_utilization || 0).toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">Model A Risk Score</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id}>
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          p.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                          p.risk_level === 'Medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.risk_level} ({p.total_score || 0})
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-semibold text-slate-700">Deep Investigation</td>
                    {selectedForComparison.map((p) => (
                      <td key={p.id}>
                        <Link
                          to={`/projects/${p.source_record_id}`}
                          className="gov-btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          Inspect Record <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 italic">
              *Comparison metrics are derived from verified authentic open data releases. Financial utilization is a disbursement proxy and does not represent physical civil construction completion.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorerPage;
