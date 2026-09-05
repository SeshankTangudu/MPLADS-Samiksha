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
  ChevronRight, 
  X,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Camera,
  MapPin,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { ComplaintsAPI, ProjectsAPI } from '../services/api';
import { useRole } from '../context/RoleContext';
import { useLanguage } from '../i18n/LanguageContext';
import LoadingState from '../components/common/LoadingState';

export const MPCitizenReportsPage = () => {
  const { selectedConstituency, changeConstituency, constituencyList } = useRole();
  const { t } = useLanguage();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskTierFilter, setRiskTierFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Active Detail Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // MP Action States
  const [remarkText, setRemarkText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        constituency: selectedConstituency,
        limit: 100,
      };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (riskTierFilter) params.risk_tier = riskTierFilter;
      if (termFilter) params.term = parseInt(termFilter, 10);

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
      console.error('Failed to load MP constituency reports:', err);
      setError(err.message || 'Failed to load citizen reports for this constituency.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedConstituency, statusFilter, categoryFilter, riskTierFilter, termFilter, sortBy]);

  const openReportDetail = async (complaintId) => {
    setModalLoading(true);
    setActionFeedback(null);
    try {
      const detail = await ComplaintsAPI.getComplaintById(complaintId);
      setSelectedReport(detail);
      setRemarkText(detail.mp_remark || '');
    } catch (err) {
      console.error('Failed to load report detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // MP Action 1: Acknowledge
  const handleAcknowledge = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await ComplaintsAPI.acknowledgeComplaint(selectedReport.complaint_id, {
        remark: remarkText.trim() || undefined
      });
      setSelectedReport(updated);
      setActionFeedback({ type: 'success', message: 'Report acknowledged successfully.' });
      fetchReports();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to acknowledge report.' });
    } finally {
      setActionLoading(false);
    }
  };

  // MP Action 2: Add Remark
  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!selectedReport || !remarkText.trim()) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await ComplaintsAPI.addMPRemark(selectedReport.complaint_id, {
        remark: remarkText.trim()
      });
      setSelectedReport(updated);
      setActionFeedback({ type: 'success', message: 'MP remark saved successfully.' });
      fetchReports();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to save remark.' });
    } finally {
      setActionLoading(false);
    }
  };

  // MP Action 3: {t('mp.field_verify_btn', 'Request Field Verification')}
  const handleRequestVerification = async () => {
    if (!selectedReport) return;
    const confirmed = window.confirm(
      "Request field verification?\n\nYour request will be visible to the Authority/Officer for follow-up."
    );
    if (!confirmed) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const updated = await ComplaintsAPI.requestVerification(selectedReport.complaint_id);
      setSelectedReport(updated);
      setActionFeedback({ 
        type: 'success', 
        message: 'Field verification requested for officer attention.' 
      });
      fetchReports();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to request verification.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Summary counts
  const totalCount = reports.length;
  const submittedCount = reports.filter(r => r.status === 'SUBMITTED').length;
  const underReviewCount = reports.filter(r => ['UNDER_REVIEW', 'EVIDENCE_REQUESTED'].includes(r.status)).length;
  const verificationRequestedCount = reports.filter(r => r.verification_requested === 1).length;

  return (
    <div className="py-6 space-y-6">
      {/* Header & Constituency Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {t('mp.title', 'Parliamentary Governance Layer')}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{t('roles.mp_title', 'MP Workflow View')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-gov-navy" />
            Citizen Reports — {selectedConstituency}
          </h1>
          <p className="text-xs text-slate-600">
            Reports submitted by citizens regarding constituency works and allocations. Citizen reports can help identify issues that may require attention.
          </p>
        </div>

        {/* Constituency Switcher */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
          <Landmark className="w-4 h-4 text-gov-navy" />
          <span className="text-xs font-bold text-slate-700">{t('common.constituency', 'Constituency')}:</span>
          <select
            value={selectedConstituency}
            onChange={(e) => changeConstituency(e.target.value)}
            className="text-xs font-bold text-gov-navy bg-slate-50 border border-slate-300 rounded px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-gov-navy/20"
          >
            {constituencyList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prototype Role Disclaimer Banner */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Prototype Role Simulation:</strong> This workspace simulates Member of Parliament constituent oversight. Production deployment would require authenticated identity and institutional authorization controls.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="gov-card p-4 space-y-1 bg-white border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">{t('mp.total_allocations', 'Total Reports')}</span>
          <span className="text-2xl font-black text-slate-900">{totalCount}</span>
          <span className="text-[10px] text-slate-400 block">{selectedConstituency} constituency</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-blue-200">
          <span className="text-[11px] font-semibold text-blue-600 block">{t('mp.filter_pending', 'Awaiting Acknowledgement')}</span>
          <span className="text-2xl font-black text-blue-900">{submittedCount}</span>
          <span className="text-[10px] text-blue-500 block">Status: SUBMITTED</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-amber-200">
          <span className="text-[11px] font-semibold text-amber-600 block">{t('authority.status_under_review', 'Under Review')}</span>
          <span className="text-2xl font-black text-amber-900">{underReviewCount}</span>
          <span className="text-[10px] text-amber-500 block">Active administrative review</span>
        </div>

        <div className="gov-card p-4 space-y-1 bg-white border-purple-200">
          <span className="text-[11px] font-semibold text-purple-600 block">{t('authority.status_evidence_req', 'Field Verification Requested')}</span>
          <span className="text-2xl font-black text-purple-900">{verificationRequestedCount}</span>
          <span className="text-[10px] text-purple-500 block">Flagged for officer attention</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gov-navy" />
            Filter Constituency Reports
          </span>
          {(statusFilter || categoryFilter || riskTierFilter || termFilter || sortBy !== 'newest') && (
            <button
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setRiskTierFilter('');
                setTermFilter('');
                setSortBy('newest');
              }}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{t('common.status', 'Status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            >
              <option value="">{t('common.all', 'All Statuses')}</option>
              <option value="SUBMITTED">{t('track.status_registered', 'Submitted')}</option>
              <option value="ACKNOWLEDGED">{t('authority.status_under_review', 'Acknowledged')}</option>
              <option value="UNDER_REVIEW">{t('authority.status_under_review', 'Under Review')}</option>
              <option value="EVIDENCE_REQUESTED">{t('authority.status_evidence_req', 'Evidence Requested')}</option>
              <option value="RESOLVED">{t('authority.status_resolved', 'Resolved')}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{t('common.category', 'Category')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            >
              <option value="">{t('common.all', 'All Categories')}</option>
              <option value="WORK_NOT_FOUND">{t('report.cat_work_not_found', 'Work Not Found')}</option>
              <option value="WORK_DELAYED">{t('report.cat_work_delayed', 'Work Delayed')}</option>
              <option value="WORK_INCOMPLETE">Work Incomplete</option>
              <option value="QUALITY_CONCERN">{t('report.cat_quality_concern', 'Quality Concern')}</option>
              <option value="COST_CONCERN">{t('report.cat_cost_concern', 'Cost Concern')}</option>
              <option value="DUPLICATE_SIMILAR_WORK">{t('report.cat_duplicate_similar_work', 'Duplicate / Similar Work')}</option>
              <option value="UTILIZATION_CONCERN">{t('report.cat_utilization_concern', 'Utilization Concern')}</option>
              <option value="ASSET_NOT_FOUND">{t('report.cat_asset_not_found', 'Asset Not Found')}</option>
              <option value="OTHER">{t('report.cat_other', 'Other')}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Analytical Risk Tier</label>
            <select
              value={riskTierFilter}
              onChange={(e) => setRiskTierFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            >
              <option value="">All Risk Tiers</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Lok Sabha Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            >
              <option value="">All Terms</option>
              <option value="17">17th Lok Sabha</option>
              <option value="16">16th Lok Sabha</option>
              <option value="15">15th Lok Sabha</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="risk">Highest Risk Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="gov-card overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading constituency citizen reports..." />
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
            <p className="text-sm font-semibold">No citizen reports match the selected filters.</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or checking another constituency.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>{t('mp.col_report_id', 'Report ID')}</th>
                  <th>Allocation Record</th>
                  <th>{t('common.category', 'Category')}</th>
                  <th>Evidence</th>
                  <th>Submitted Date</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>Analytical Risk</th>
                  <th>Verification</th>
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
                            {r.lok_sabha_term ? `${r.lok_sabha_term}th Lok Sabha` : 'MPLADS'} · {r.allocation_category || 'Civic'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">General Civic Observation</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-900 block">
                        {r.category_label || r.category}
                      </span>
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
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                        r.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        r.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        r.status === 'EVIDENCE_REQUESTED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        r.status === 'ACKNOWLEDGED' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                        'bg-slate-100 text-blue-800 border-blue-200'
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
                      {r.verification_requested === 1 ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          ✓ Requested
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">None</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openReportDetail(r.complaint_id)}
                        className="gov-btn-primary py-1 px-3 text-xs font-semibold flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MP REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 space-y-6 p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Citizen Report Review</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="font-mono text-xs font-bold text-gov-navy">{selectedReport.complaint_id}</span>
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

            {/* CITIZEN OBSERVATION CARD */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gov-navy" />
                  Citizen Observation
                </span>
                <span className="text-slate-500">
                  Submitted: {new Date(selectedReport.submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-900 font-medium leading-relaxed bg-white p-3 rounded border border-slate-200">
                "{selectedReport.description}"
              </p>
            </div>

            {/* EVIDENCE & LOCATION INTELLIGENCE */}
            {selectedReport.evidence && (selectedReport.evidence.has_photo || selectedReport.evidence.has_gps) && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-gov-navy" />
                    Attached Evidence &amp; Verification Signals
                  </span>
                  {selectedReport.allocation_reports_count > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      💬 {selectedReport.allocation_reports_count} Reports on this Allocation
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo Display */}
                  {selectedReport.evidence.has_photo && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Citizen Uploaded Photo
                      </span>
                      <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black/5 aspect-video flex items-center justify-center">
                        <img 
                          src={ComplaintsAPI.getEvidenceFileUrl(selectedReport.complaint_id)} 
                          alt="Citizen Evidence"
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(ComplaintsAPI.getEvidenceFileUrl(selectedReport.complaint_id), '_blank')}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{selectedReport.evidence.original_filename}</span>
                        {selectedReport.evidence.image_width && (
                          <span>{selectedReport.evidence.image_width} × {selectedReport.evidence.image_height} px</span>
                        )}
                      </div>
                    </div>
                  )}

                    {/* Location & Metadata Details */}
                    <div className="space-y-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {t('evidence.title')}
                      </span>

                      {/* Location Status Badge */}
                      <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold">{t('evidence.location_status')}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            selectedReport.evidence.location_review_status === 'LOCATION_CONSISTENT_CONTEXT' || selectedReport.evidence.location_review_status === 'LOCATION_CONTEXT_AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : selectedReport.evidence.location_review_status === 'LOCATION_REQUIRES_REVIEW'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {selectedReport.evidence.location_review_status === 'LOCATION_CONSISTENT_CONTEXT' || selectedReport.evidence.location_review_status === 'LOCATION_CONTEXT_AVAILABLE'
                              ? `✓ ${t('evidence.location_consistent')}`
                              : selectedReport.evidence.location_review_status === 'LOCATION_REQUIRES_REVIEW'
                              ? `⚠ ${t('evidence.location_requires_review')}`
                              : t('evidence.location_unavailable')}
                          </span>
                        </div>
                        {selectedReport.evidence.distance_from_district_centroid_km !== null && (
                          <p className="text-[11px] text-slate-600">
                            {t('evidence.distance_to_centroid')} <strong>{selectedReport.evidence.distance_from_district_centroid_km.toFixed(1)} km</strong> ({t('evidence.district_centroid_note')})
                          </p>
                        )}
                        {selectedReport.evidence.location_review_details && (
                          <p className="text-[10px] text-slate-500 pt-0.5">
                            {selectedReport.evidence.location_review_details}
                          </p>
                        )}
                      </div>

                      {/* Metadata & Timestamp Card */}
                      <div className="p-2.5 rounded bg-white border border-slate-200 space-y-1 text-[11px]">
                        {selectedReport.evidence.camera_make && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('evidence.camera_device')}</span>
                            <span className="font-semibold text-slate-700">{selectedReport.evidence.camera_make} {selectedReport.evidence.camera_model || ''}</span>
                          </div>
                        )}
                        {selectedReport.evidence.captured_at && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('evidence.captured_at')}</span>
                            <span className="font-semibold text-slate-700">{new Date(selectedReport.evidence.captured_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedReport.evidence.timestamp_review_status && selectedReport.evidence.timestamp_review_status !== 'TIMESTAMP_UNAVAILABLE' && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-500">{t('evidence.timestamp_title')}:</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              selectedReport.evidence.timestamp_review_status === 'TIMESTAMP_CONSISTENT' ? 'bg-emerald-50 text-emerald-800' :
                              selectedReport.evidence.timestamp_review_status === 'TIMESTAMP_PREDATES_SANCTION' ? 'bg-amber-50 text-amber-800' :
                              'bg-red-50 text-red-800'
                            }`}>
                              {selectedReport.evidence.timestamp_review_status === 'TIMESTAMP_CONSISTENT' ? `✓ ${t('evidence.timestamp_consistent')}` :
                               selectedReport.evidence.timestamp_review_status === 'TIMESTAMP_PREDATES_SANCTION' ? `⚠ ${t('evidence.timestamp_predates_sanction')}` :
                               selectedReport.evidence.timestamp_review_status}
                            </span>
                          </div>
                        )}
                        {selectedReport.nearby_reports_count > 0 && (
                          <div className="flex justify-between pt-1 border-t border-slate-100 text-blue-700 font-bold">
                            <span>Nearby Reports (&lt;25km):</span>
                            <span>{selectedReport.nearby_reports_count} reports</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* ALLOCATION & READ-ONLY ANALYTICAL CONTEXT */}
            {selectedReport.linked_allocation_id && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gov-navy" />
                    Allocation &amp; Read-Only Analytical Context
                  </h3>
                  <Link
                    to={`/projects/${selectedReport.linked_allocation_id}`}
                    target="_blank"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Deep Allocation Record <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Record Key</span>
                    <span className="font-mono font-bold text-gov-navy">{selectedReport.linked_allocation_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sanctioned Budget</span>
                    <span className="font-bold text-slate-800">₹{selectedReport.sanctioned_cost?.toFixed(2) || '0.00'} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Reported Spent</span>
                    <span className="font-bold text-slate-800">₹{selectedReport.expenditure?.toFixed(2) || '0.00'} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Model A Risk Tier</span>
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
                </div>

                {/* Analytical Reason Decomposition if present */}
                {selectedReport.reasons && selectedReport.reasons.length > 0 && (
                  <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-gov-navy flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gov-navy" />
                      Analytical Signals on this Allocation (Read-Only)
                    </span>
                    <div className="space-y-1">
                      {selectedReport.reasons.map((flag, idx) => (
                        <div key={idx} className="text-xs text-slate-800 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gov-navy mt-1.5 flex-shrink-0" />
                          <span><strong>{flag.title}:</strong> {flag.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MP ACTIONS & REMARKS SECTION */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-gov-navy" />
                Member of Parliament Actions &amp; Remarks
              </h3>

              {/* Action 1: Acknowledge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Acknowledge Citizen Report</span>
                  <span className="text-[11px] text-slate-500 block">
                    {selectedReport.acknowledged_at 
                      ? `Acknowledged on ${new Date(selectedReport.acknowledged_at).toLocaleString()}`
                      : 'Acknowledge that constituent report has been received for review.'}
                  </span>
                </div>
                {selectedReport.status === 'SUBMITTED' ? (
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={actionLoading}
                    className="gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acknowledge Report
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    ✓ Acknowledged
                  </span>
                )}
              </div>

              {/* Action 2: MP Remark Form */}
              <form onSubmit={handleAddRemark} className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Add MP Observation / Constituent Remark:
                </label>
                <textarea
                  rows={3}
                  required
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Record an official constituent remark or context (e.g. Instructed local Nodal Officer to inspect site)..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy/20 focus:border-gov-navy"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || !remarkText.trim()}
                    className="gov-btn-secondary text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Save MP Remark
                  </button>
                </div>
              </form>

              {/* Action 3: {t('mp.field_verify_btn', 'Request Field Verification')} */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-purple-50/50 rounded-lg border border-purple-200 gap-3">
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Formal Field Verification Request</span>
                  <span className="text-[11px] text-purple-700 block">
                    {selectedReport.verification_requested === 1
                      ? `Field verification requested on ${new Date(selectedReport.verification_requested_at).toLocaleString()}`
                      : 'Flag this allocation for on-ground administrative site verification by district authorities.'}
                  </span>
                </div>
                {selectedReport.verification_requested === 1 ? (
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded border border-purple-300 flex items-center gap-1 flex-shrink-0">
                    ✓ Verification Requested
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestVerification}
                    disabled={actionLoading}
                    className="gov-btn-primary bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('mp.field_verify_btn', 'Request Field Verification')}
                  </button>
                )}
              </div>
            </div>

            {/* Strict MP Permission Boundary Notice */}
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-500 italic space-y-0.5">
              <span>*MP Boundary: Workflow status transitions (Evidence Requested, Escalated, Resolved) are strictly managed by the District Authority and Administrative Officers. Analytical Model A scores remain frozen.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MPCitizenReportsPage;
