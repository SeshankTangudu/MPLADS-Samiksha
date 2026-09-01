import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  Landmark
} from 'lucide-react';
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const ExplorerPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [sortBy, setSortBy] = useState('expenditure');
  const [sortOrder, setSortOrder] = useState('desc');

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
  }, [page, limit, search, selectedState, selectedCategory, selectedStatus, selectedTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleResetFilters = () => {
    setSearch('');
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
            Allocation Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and inspect 1,675 Constituency-Level Parliamentary Term Work & Fund Allocations (2009–2024)
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          Showing <strong>{projects.length}</strong> of <strong>{total.toLocaleString()}</strong> records
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="gov-card p-5 space-y-4">
        {/* Top Row: Search & Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by MP, District, Constituency, or Record ID..."
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
              Reset Filters
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Civic Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">All Categories</option>
              <option value="Infrastructure & Public Amenities">Infrastructure & Amenities</option>
              <option value="Community Development">Community Development</option>
              <option value="Rural & Urban Development">Rural & Urban Development</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lok Sabha Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => { setSelectedTerm(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">All Terms (15th–17th)</option>
              <option value="17">17th LS (2019–2024)</option>
              <option value="16">16th LS (2014–2019)</option>
              <option value="15">15th LS (2009–2014)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Financial Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed (Financial)</option>
              <option value="Allocated">Allocated</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="expenditure">Reported Expenditure</option>
              <option value="sanctioned_cost">Sanctioned Budget</option>
              <option value="unspent_balance">Unspent Balance</option>
              <option value="sanction_date">Sanction Date</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sort Order</label>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              className="gov-input text-xs w-full py-1.5"
            >
              <option value="desc">Highest First (Desc)</option>
              <option value="asc">Lowest First (Asc)</option>
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
            <p className="text-sm font-semibold">No allocation records match the specified filters.</p>
            <p className="text-xs text-slate-400">Try resetting filters or adjusting search parameters.</p>
            <button onClick={handleResetFilters} className="gov-btn-secondary text-xs mt-2">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Member of Parliament</th>
                  <th>Constituency / State</th>
                  <th>Civic Category</th>
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
                  <th>Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const util = p.financial_utilization || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="font-mono text-xs font-semibold text-slate-700">
                        {p.source_record_id}
                        <span className="block text-[10px] text-slate-400 font-sans">
                          {p.lok_sabha_term}th Lok Sabha
                        </span>
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
                        <Link
                          to={`/projects/${p.source_record_id}`}
                          className="inline-flex items-center text-xs font-semibold text-gov-navy hover:text-gov-navyLight p-1 rounded hover:bg-slate-100"
                          title="Deep investigation and peer breakdown"
                        >
                          <ExternalLink className="w-4 h-4" />
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
    </div>
  );
};

export default ExplorerPage;
