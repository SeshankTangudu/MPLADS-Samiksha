import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Landmark, 
  FileText, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send, 
  Eye, 
  Info, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  X,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Layers,
  Tag,
  Camera,
  MapPin,
  Image as ImageIcon,
  Compass,
  FileCheck
} from 'lucide-react';
import { ComplaintsAPI, ProjectsAPI } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import LoadingState from '../components/common/LoadingState';

export const AuthorityComplaintQueuePage = () => {
  const { t } = useLanguage();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [constituencyFilter, setConstituencyFilter] = useState('');
  const [riskTierFilter, setRiskTierFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [verificationOnly, setVerificationOnly] = useState(false);
  const [multipleSignalsOnly, setMultipleSignalsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Detail Modal & Triage Workspace
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [officerNoteText, setOfficerNoteText] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 100,
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (stateFilter) params.state = stateFilter;
      if (districtFilter) params.district = districtFilter;
      if (constituencyFilter) params.constituency = constituencyFilter;
      if (riskTierFilter) params.risk_tier = riskTierFilter;
      if (termFilter) params.term = parseInt(termFilter, 10);
      if (verificationOnly) params.verification_requested_only = true;
      if (multipleSignalsOnly) params.multiple_signals_only = true;

      const res = await ComplaintsAPI.getComplaints(params);
      let items = res?.items || [];

      // Sort
      if (sortBy === 'newest') {
        items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      } else if (sortBy === 'oldest') {
        items.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
      } else if (sortBy === 'risk') {
        items.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      }

      setReports(items);
    } catch (err) {
      console.error('Failed to load authority complaint queue:', err);
      setError(err.message || 'Failed to load citizen reports queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [
    statusFilter, 
    categoryFilter, 
    stateFilter, 
    districtFilter, 
    constituencyFilter, 
    riskTierFilter, 
    termFilter, 
    verificationOnly, 
    multipleSignalsOnly, 
    sortBy
  ]);

  const openReportDetail = async (complaintId) => {
    setModalLoading(true);
    setActionFeedback(null);
    setTransitionReason('');
    try {
      const detail = await ComplaintsAPI.getComplaintById(complaintId);
      setSelectedReport(detail);
      setOfficerNoteText(detail.officer_note || '');
    } catch (err) {
      console.error('Failed to load complaint detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Authority Action 1: Status Transition
  const handleStatusTransition = async (targetStatus) => {
    if (!selectedReport) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await ComplaintsAPI.updateStatus(selectedReport.complaint_id, {
        status: targetStatus,
        reason: transitionReason.trim() || undefined
      });
      setSelectedReport(updated);
      setTransitionReason('');
      setActionFeedback({ 
        type: 'success', 
        message: `Workflow status transitioned to ${targetStatus}.` 
      });
      fetchReports();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to update workflow status.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Authority Action 2: Save Officer Note
  const handleSaveOfficerNote = async (e) => {
    e.preventDefault();
    if (!selectedReport || !officerNoteText.trim()) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await ComplaintsAPI.addOfficerNote(selectedReport.complaint_id, {
        note: officerNoteText.trim()
      });
      setSelectedReport(updated);
      setActionFeedback({ type: 'success', message: 'Internal officer note saved successfully.' });
      fetchReports();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to save officer note.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Summary counts
  const totalCount = reports.length;
  const underReviewCount = reports.filter(r => r.status === 'UNDER_REVIEW').length;
  const evidenceRequestedCount = reports.filter(r => r.status === 'EVIDENCE_REQUESTED').length;
  const verificationRequestedCount = reports.filter(r => r.verification_requested === 1).length;
  const multipleSignalsCount = reports.filter(r => r.multiple_review_signals === true).length;

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {t('authority.title', 'Administrative Governance Queue')}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{t('authority.tab_investigation', 'Authority Triage Workspace')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-gov-navy" />
            Citizen Reports
          </h1>
          <p className="text-xs text-slate-600">
            Review citizen observations alongside existing analytical signals. Citizen observations can be reviewed alongside existing analytical signals to prioritize administrative inspection.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/anomalies"
            className="gov-btn-secondary text-xs flex items-center gap-1.5 shadow-sm font-semibold"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Model A Anomaly Queue
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="gov-card p-4 space-y-1 bg-white border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">{t('common.total', 'Total Reports')}</span>
          <span className="text-2xl font-black text-slate-900">{totalCount}</span>
          <span className="text-[10px] text-slate-400 block">All recorded observations</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-blue-200">
          <span className="text-[11px] font-semibold text-blue-600 block">{t('authority.status_under_review', 'Under Review')}</span>
          <span className="text-2xl font-black text-blue-900">{underReviewCount}</span>
          <span className="text-[10px] text-blue-500 block">Active triage investigation</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-amber-200">
          <span className="text-[11px] font-semibold text-amber-600 block">{t('authority.status_evidence_req', 'Evidence Requested')}</span>
          <span className="text-2xl font-black text-amber-900">{evidenceRequestedCount}</span>
          <span className="text-[10px] text-amber-500 block">Awaiting vouchers / records</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-purple-200">
          <span className="text-[11px] font-semibold text-purple-600 block">MP Verification Flag</span>
          <span className="text-2xl font-black text-purple-900">{verificationRequestedCount}</span>
          <span className="text-[10px] text-purple-500 block">Requested by MP</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-indigo-200">
          <span className="text-[11px] font-semibold text-indigo-600 block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Multiple Review Signals
          </span>
          <span className="text-2xl font-black text-indigo-950">{multipleSignalsCount}</span>
          <span className="text-[10px] text-indigo-500 block">Report + Analytical Flag</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="gov-card p-4 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gov-navy" />
            {t('common.filter', 'Filter Administrative Queue')}
          </span>
          {(statusFilter || categoryFilter || stateFilter || districtFilter || constituencyFilter || riskTierFilter || termFilter || verificationOnly || multipleSignalsOnly || sortBy !== 'newest') && (
            <button
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setStateFilter('');
                setDistrictFilter('');
                setConstituencyFilter('');
                setRiskTierFilter('');
                setTermFilter('');
                setVerificationOnly(false);
                setMultipleSignalsOnly(false);
                setSortBy('newest');
              }}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{t('common.status', 'Status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="UNDER_REVIEW">{t('authority.status_under_review', 'Under Review')}</option>
              <option value="EVIDENCE_REQUESTED">{t('authority.status_evidence_req', 'Evidence Requested')}</option>
              <option value="RESOLVED">{t('authority.status_resolved', 'Resolved')}</option>
              <option value="ESCALATED">Escalated</option>
              <option value="FALSE_POSITIVE_INVALID">Closed / Invalid</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{t('common.category', 'Category')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All</option>
              <option value="WORK_NOT_FOUND">Work Not Found</option>
              <option value="WORK_DELAYED">Work Delayed</option>
              <option value="WORK_INCOMPLETE">Work Incomplete</option>
              <option value="QUALITY_CONCERN">Quality Concern</option>
              <option value="COST_CONCERN">Cost Concern</option>
              <option value="DUPLICATE_SIMILAR_WORK">Duplicate Work</option>
              <option value="UTILIZATION_CONCERN">Utilization</option>
              <option value="ASSET_NOT_FOUND">Asset Missing</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">State</label>
            <input
              type="text"
              placeholder="State..."
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">District</label>
            <input
              type="text"
              placeholder="District..."
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Constituency</label>
            <input
              type="text"
              placeholder="Constituency..."
              value={constituencyFilter}
              onChange={(e) => setConstituencyFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Risk Tier</label>
            <select
              value={riskTierFilter}
              onChange={(e) => setRiskTierFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All</option>
              <option value="17">17th LS</option>
              <option value="16">16th LS</option>
              <option value="15">15th LS</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="risk">Risk Score</option>
            </select>
          </div>
        </div>

        {/* Checkbox Quick Filters */}
        <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-1.5 text-purple-900 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verificationOnly}
              onChange={(e) => setVerificationOnly(e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <span>Show Only MP Verification Requests</span>
          </label>

          <label className="flex items-center gap-1.5 text-indigo-900 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={multipleSignalsOnly}
              onChange={(e) => setMultipleSignalsOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Show Only Multiple Review Signals
            </span>
          </label>
        </div>
      </div>

      {/* QUEUE TABLE */}
      <div className="gov-card overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading administrative citizen reports queue..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <p className="font-semibold text-sm">{error}</p>
            <button onClick={fetchReports} className="gov-btn-primary text-xs">
              Retry Query
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold">No citizen reports match the specified queue filters.</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or resetting the search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Allocation Record</th>
                  <th>Constituency</th>
                  <th>District / State</th>
                  <th>{t('common.category', 'Category')}</th>
                  <th>Evidence</th>
                  <th>Submitted</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>Risk Tier</th>
                  <th>Review Signals</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono text-xs font-bold text-gov-navy">
                      {r.complaint_id}
                    </td>
                    <td>
                      {r.linked_allocation_id ? (
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {r.linked_allocation_id}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {r.lok_sabha_term ? `${r.lok_sabha_term}th Lok Sabha` : 'MPLADS'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unlinked Civic Observation</span>
                      )}
                    </td>
                    <td className="text-xs font-medium text-slate-900">
                      {r.constituency || '—'}
                    </td>
                    <td>
                      <span className="text-xs text-slate-800 block">{r.district || '—'}</span>
                      <span className="text-[10px] text-slate-400">{r.state || '—'}</span>
                    </td>
                    <td className="text-xs font-semibold text-slate-800">
                      {r.category_label || r.category}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {r.evidence?.has_photo ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200" title="Photo Evidence Attached">
                            <Camera className="w-3 h-3" /> Photo
                          </span>
                        ) : null}
                        {r.evidence?.has_gps ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="GPS Coords Attached">
                            <MapPin className="w-3 h-3" /> GPS
                          </span>
                        ) : null}
                        {!r.evidence?.has_photo && !r.evidence?.has_gps && (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs text-slate-600">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        r.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        r.status === 'EVIDENCE_REQUESTED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        r.status === 'ESCALATED' ? 'bg-red-100 text-red-800 border-red-300' :
                        r.status === 'FALSE_POSITIVE_INVALID' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {r.status_label || r.status}
                      </span>
                    </td>
                    <td>
                      {r.risk_score !== null && r.risk_score !== undefined ? (
                        <span className={`gov-badge ${
                          r.risk_level === 'High' ? 'gov-badge-high' :
                          r.risk_level === 'Medium' ? 'gov-badge-medium' :
                          'gov-badge-low'
                        }`}>
                          {r.risk_level} ({r.risk_score})
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      {r.multiple_review_signals ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200"
                          title="A citizen observation and an analytical signal point to the same allocation, triggering structured human review."
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          Multiple Review Signals
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Single Signal</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openReportDetail(r.complaint_id)}
                        className="gov-btn-primary py-1 px-2.5 text-xs font-semibold flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect &amp; Triage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUTHORITY DETAIL & TRIAGE MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 space-y-6 p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                    Administrative Review Workspace
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="font-mono text-xs font-bold text-slate-800">{selectedReport.complaint_id}</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                    selectedReport.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    selectedReport.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    selectedReport.status === 'EVIDENCE_REQUESTED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    selectedReport.status === 'ESCALATED' ? 'bg-red-100 text-red-800 border-red-300' :
                    selectedReport.status === 'FALSE_POSITIVE_INVALID' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                    'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {selectedReport.status_label || selectedReport.status}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedReport.category_label || selectedReport.category}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Feedback Alerts */}
            {actionFeedback && (
              <div className={`p-3.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                actionFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{actionFeedback.message}</span>
              </div>
            )}

            {/* TWO-COLUMN SPLIT LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN: CITIZEN & MP CONTEXT + OFFICER TRIAGE */}
              <div className="space-y-4">
                {/* Citizen Report */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gov-navy" />
                      Citizen Observation
                    </span>
                    <span className="text-slate-500">
                      {new Date(selectedReport.submitted_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-900 font-medium leading-relaxed bg-white p-3 rounded border border-slate-200">
                    "{selectedReport.description}"
                  </p>
                </div>

                {/* EVIDENCE & LOCATION FORENSICS CARD */}
                {selectedReport.evidence && (selectedReport.evidence.has_photo || selectedReport.evidence.has_gps) && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-gov-navy" />
                        Citizen Evidence &amp; Location Consistency
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        selectedReport.evidence.location_review_status === 'LOCATION_CONTEXT_AVAILABLE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : selectedReport.evidence.location_review_status === 'LOCATION_REQUIRES_REVIEW'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {selectedReport.evidence.location_review_status === 'LOCATION_CONTEXT_AVAILABLE' ? '✓ Consistent Location' :
                         selectedReport.evidence.location_review_status === 'LOCATION_REQUIRES_REVIEW' ? '⚠ Review Recommended' : 'Context Unavailable'}
                      </span>
                    </div>

                    {/* Photo Preview & EXIF Metadata */}
                    {selectedReport.evidence.has_photo && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Submitted Photograph Evidence
                        </span>
                        <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900/5 aspect-video flex items-center justify-center">
                          <img 
                            src={ComplaintsAPI.getEvidenceFileUrl(selectedReport.complaint_id)} 
                            alt="Citizen Evidence"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(ComplaintsAPI.getEvidenceFileUrl(selectedReport.complaint_id), '_blank')}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-white rounded border border-slate-200">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Filename:</span>
                            <span className="font-semibold text-slate-800 truncate block">{selectedReport.evidence.original_filename}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Dimensions &amp; Size:</span>
                            <span className="font-semibold text-slate-800">
                              {selectedReport.evidence.image_width ? `${selectedReport.evidence.image_width} × ${selectedReport.evidence.image_height} px` : 'Unknown'} · {(selectedReport.evidence.file_size_bytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Camera / Device:</span>
                            <span className="font-semibold text-slate-800">
                              {selectedReport.evidence.camera_make ? `${selectedReport.evidence.camera_make} ${selectedReport.evidence.camera_model}` : 'Not Available in EXIF'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">EXIF Timestamp:</span>
                            <span className="font-semibold text-slate-800">
                              {selectedReport.evidence.captured_at ? new Date(selectedReport.evidence.captured_at).toLocaleString() : 'Not Stamped'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Location Consistency Evaluation */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Geographic Analysis (Haversine Distance)
                      </span>
                      <div className="p-3 bg-white rounded border border-slate-200 space-y-2 text-[11px]">
                        {selectedReport.evidence.latitude !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Citizen Observation GPS:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {selectedReport.evidence.latitude.toFixed(5)}°, {selectedReport.evidence.longitude.toFixed(5)}°
                              {selectedReport.evidence.location_accuracy_meters && (
                                <span className="text-[10px] text-slate-400 ml-1">(±{selectedReport.evidence.location_accuracy_meters.toFixed(0)}m)</span>
                              )}
                            </span>
                          </div>
                        )}

                        {selectedReport.evidence.distance_from_district_centroid_km !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Distance from District Admin Centroid:</span>
                            <span className={`font-mono font-bold ${
                              selectedReport.evidence.distance_from_district_centroid_km > 100 ? 'text-amber-700' : 'text-slate-900'
                            }`}>
                              {selectedReport.evidence.distance_from_district_centroid_km.toFixed(1)} km
                            </span>
                          </div>
                        )}

                        {selectedReport.evidence.exif_vs_browser_gps_delta_km !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">EXIF GPS vs Browser GPS Delta:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {selectedReport.evidence.exif_vs_browser_gps_delta_km.toFixed(1)} km
                            </span>
                          </div>
                        )}

                        <div className="p-2 bg-slate-50 rounded text-[10px] text-slate-600 space-y-0.5">
                          <p className="font-semibold text-slate-700">Governance Review Note:</p>
                          <p>
                            District administrative centroid serves strictly as an approximate reference point, not project GPS. Observations with distance &gt;100 km are flagged for verification review.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MP Response Card */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-gov-navy" />
                      Member of Parliament Response
                    </span>
                    {selectedReport.verification_requested === 1 && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                        Field Verification Requested
                      </span>
                    )}
                  </div>
                  {selectedReport.mp_remark ? (
                    <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 block">
                        Recorded: {selectedReport.mp_remark_at ? new Date(selectedReport.mp_remark_at).toLocaleString() : 'Recent'}
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        "{selectedReport.mp_remark}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No constituent remarks recorded by MP yet.</p>
                  )}
                </div>

                {/* Internal Officer Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-gov-navy" />
                      Internal Officer Investigation Notes
                    </label>
                    <span className="text-[10px] text-slate-400 italic">Confidential / Internal</span>
                  </div>
                  <form onSubmit={handleSaveOfficerNote} className="space-y-2">
                    <textarea
                      rows={3}
                      value={officerNoteText}
                      onChange={(e) => setOfficerNoteText(e.target.value)}
                      placeholder="Document physical site findings, agency communications, or audit disposition rationale..."
                      className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy/20 focus:border-gov-navy"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={actionLoading || !officerNoteText.trim()}
                        className="gov-btn-secondary text-xs font-bold px-4 py-1.5 flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        Save Officer Note
                      </button>
                    </div>
                  </form>
                </div>

                {/* WORKFLOW STATUS CONTROLS */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                    Administrative Workflow Transitions
                  </span>

                  <input
                    type="text"
                    placeholder="Optional transition reason / explanation..."
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedReport.status === 'SUBMITTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('UNDER_REVIEW')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Begin Review (UNDER REVIEW)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('FALSE_POSITIVE_INVALID')}
                          disabled={actionLoading}
                          className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                        >
                          Mark Closed / Invalid
                        </button>
                      </>
                    )}

                    {selectedReport.status === 'ACKNOWLEDGED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('UNDER_REVIEW')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Begin Review (UNDER REVIEW)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('FALSE_POSITIVE_INVALID')}
                          disabled={actionLoading}
                          className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                        >
                          Mark Closed / Invalid
                        </button>
                      </>
                    )}

                    {selectedReport.status === 'UNDER_REVIEW' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('EVIDENCE_REQUESTED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Request Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('ESCALATED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Escalate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('RESOLVED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('FALSE_POSITIVE_INVALID')}
                          disabled={actionLoading}
                          className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                        >
                          Mark Closed / Invalid
                        </button>
                      </>
                    )}

                    {selectedReport.status === 'EVIDENCE_REQUESTED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('UNDER_REVIEW')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Return to Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('RESOLVED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('ESCALATED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Escalate
                        </button>
                      </>
                    )}

                    {selectedReport.status === 'ESCALATED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('RESOLVED')}
                          disabled={actionLoading}
                          className="gov-btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5"
                        >
                          Resolve Escalation
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusTransition('UNDER_REVIEW')}
                          disabled={actionLoading}
                          className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                        >
                          Reopen Review
                        </button>
                      </>
                    )}

                    {['RESOLVED', 'FALSE_POSITIVE_INVALID'].includes(selectedReport.status) && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition('UNDER_REVIEW')}
                        disabled={actionLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                      >
                        Reopen for Review
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ALLOCATION & ANALYTICAL CONTEXT */}
              <div className="space-y-4">
                {/* Multiple Review Signals Banner */}
                {selectedReport.multiple_review_signals && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 space-y-1 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      ⭐ Multiple Review Signals
                    </div>
                    <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                      A citizen observation and an analytical signal point to the same allocation, triggering structured human review.
                    </p>
                  </div>
                )}

                {/* REPEATED CITIZEN REPORTS & PROXIMITY CARD */}
                {(selectedReport.allocation_reports_count > 1 || selectedReport.nearby_reports_count > 0) && (
                  <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gov-navy flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-gov-navy" />
                        Repeated Report &amp; Proximity Cluster
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                        {selectedReport.allocation_reports_count} Reports on Allocation
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded border border-blue-100">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Allocation Reports:</span>
                        <span className="font-bold text-slate-800">{selectedReport.allocation_reports_count} distinct citizen submissions</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Nearby GPS Reports (&lt;25km):</span>
                        <span className="font-bold text-slate-800">{selectedReport.nearby_reports_count} reports in proximity</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-blue-900 font-medium">
                      ℹ Multiple independent observations for the same allocation provide heightened governance visibility for site verification.
                    </p>
                  </div>
                )}

                {/* Allocation Entity Context */}
                {selectedReport.linked_allocation_id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gov-navy" />
                        Allocation &amp; Financial Context
                      </h3>
                      <Link
                        to={`/projects/${selectedReport.linked_allocation_id}`}
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Full Investigation Dossier <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Record Key</span>
                        <span className="font-mono font-bold text-gov-navy">{selectedReport.linked_allocation_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Parliamentary Term</span>
                        <span className="font-bold text-slate-800">{selectedReport.lok_sabha_term}th Lok Sabha</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Constituency</span>
                        <span className="font-bold text-slate-800">{selectedReport.constituency}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Member of Parliament</span>
                        <span className="font-bold text-slate-800">{selectedReport.mp_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Sanctioned Budget</span>
                        <span className="font-bold text-slate-800">₹{selectedReport.sanctioned_cost?.toFixed(2) || '0.00'} Cr</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Reported Spent</span>
                        <span className="font-bold text-slate-800">₹{selectedReport.expenditure?.toFixed(2) || '0.00'} Cr</span>
                      </div>
                    </div>

                    {/* Model A Analytical Breakdown */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-gov-navy" />
                          Model A Risk Assessment (Read-Only)
                        </span>
                        {selectedReport.risk_score !== null && selectedReport.risk_score !== undefined ? (
                          <span className={`gov-badge ${
                            selectedReport.risk_level === 'High' ? 'gov-badge-high' :
                            selectedReport.risk_level === 'Medium' ? 'gov-badge-medium' :
                            'gov-badge-low'
                          }`}>
                            {selectedReport.risk_level} ({selectedReport.risk_score})
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </div>

                      {selectedReport.reasons && selectedReport.reasons.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          {selectedReport.reasons.map((r, idx) => (
                            <div key={idx} className="p-2.5 bg-white rounded border border-slate-200 space-y-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{r.title}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                                  {r.flag_type}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">{r.explanation}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No elevated anomaly signals triggered for this record.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-1 text-xs">
                    <Info className="w-6 h-6 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700">Unlinked General Observation</h4>
                    <p className="text-slate-500">This report was submitted as a general civic observation without reference to a specific allocation key.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityComplaintQueuePage;
