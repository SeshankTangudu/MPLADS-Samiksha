import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Landmark, 
  ArrowLeft, 
  ShieldCheck, 
  Info,
  Calendar,
  Layers,
  Check,
  Copy,
  AlertCircle,
  Camera,
  MapPin
} from 'lucide-react';
import { ComplaintsAPI } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import LoadingState from '../components/common/LoadingState';

const TIMELINE_STEPS = [
  { statusKey: 'SUBMITTED', labelKey: 'track.status_submitted', fallback: 'Submitted' },
  { statusKey: 'ACKNOWLEDGED', labelKey: 'track.status_acknowledged', fallback: 'Acknowledged' },
  { statusKey: 'UNDER_REVIEW', labelKey: 'track.status_under_review', fallback: 'Under Review' },
  { statusKey: 'EVIDENCE_REQUESTED', labelKey: 'track.status_evidence_requested', fallback: 'Evidence Requested' },
  { statusKey: 'RESOLVED', labelKey: 'track.status_resolved', fallback: 'Resolved' },
];

export const CitizenTrackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const queryParams = new URLSearchParams(location.search);
  const initialId = queryParams.get('id') || '';

  const [searchId, setSearchId] = useState(initialId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchReport = async (idToFetch) => {
    if (!idToFetch || !idToFetch.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const data = await ComplaintsAPI.getComplaintById(idToFetch.trim());
      // Explicitly filter to public-safe fields only (prevent any internal fields leak)
      const publicSafeData = {
        complaint_id: data.complaint_id,
        linked_allocation_id: data.linked_allocation_id,
        category: data.category,
        category_label: data.category_label,
        description: data.description,
        status: data.status,
        status_label: data.status_label,
        submitted_at: data.submitted_at,
        acknowledged_at: data.acknowledged_at,
        resolved_at: data.resolved_at,
        evidence_public_safe: data.evidence_public_safe || { has_photo: false, has_gps: false },
        // Public allocation context if available
        constituency: data.constituency,
        state: data.state,
        mp_name: data.mp_name,
        allocation_category: data.allocation_category,
        sanctioned_cost: data.sanctioned_cost,
        expenditure: data.expenditure,
      };
      setReport(publicSafeData);
    } catch (err) {
      console.warn('Failed to retrieve complaint tracking data:', err);
      if (err.status === 404) {
        setError(t('track.error_not_found', 'Report not found. Please check the Report ID and try again.'));
      } else {
        setError(t('track.error_generic', "We couldn't retrieve the report right now. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchReport(initialId);
    }
  }, [initialId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/reports/track?id=${encodeURIComponent(searchId.trim())}`);
      fetchReport(searchId.trim());
    }
  };

  const handleCopyId = () => {
    if (report?.complaint_id) {
      navigator.clipboard.writeText(report.complaint_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getStatusExplanation = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED':
        return t('track.explanation_submitted', 'Your report has been received and is awaiting review.');
      case 'ACKNOWLEDGED':
        return t('track.explanation_acknowledged', 'Your report has been acknowledged for review.');
      case 'UNDER_REVIEW':
        return t('track.explanation_under_review', 'The report is currently being reviewed.');
      case 'EVIDENCE_REQUESTED':
        return t('track.explanation_evidence_requested', 'Additional verification or information has been requested.');
      case 'RESOLVED':
        return t('track.explanation_resolved', 'The review has reached a resolution.');
      case 'ESCALATED':
        return t('track.explanation_escalated', 'The report has been referred for further review.');
      case 'FALSE_POSITIVE_INVALID':
        return t('track.explanation_closed', 'The report has been closed after review.');
      default:
        return t('track.explanation_generic', 'The report is progressing through standard administrative review.');
    }
  };

  const getTimelineStepIndex = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED':
        return 0;
      case 'ACKNOWLEDGED':
        return 1;
      case 'UNDER_REVIEW':
        return 2;
      case 'EVIDENCE_REQUESTED':
        return 3;
      case 'RESOLVED':
        return 4;
      default:
        return 2; // For Escalated or Closed, highlight up to Under Review
    }
  };

  return (
    <div className="py-8 max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-navy hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('report.back_to_explore', 'Back to Explore Allocations')}
        </Link>
        <Link
          to="/reports/new"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
        >
          <FileText className="w-3.5 h-3.5" />
          {t('track.link_submit_new', 'Submit a New Report')}
        </Link>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('track.title', 'Track Your Report')}
        </h1>
        <p className="text-sm text-slate-600">
          {t('track.sub', 'Check real-time review progress using your unique Report ID.')}
        </p>
      </div>

      {/* Tracker Lookup Bar */}
      <form onSubmit={handleSearchSubmit} className="gov-card p-4 sm:p-5 bg-white shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          {t('track.input_label', 'Enter Report ID')}
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="e.g. MPLADS-2026-482915"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full text-xs font-mono pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy/20 focus:border-gov-navy uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchId.trim()}
            className="gov-btn-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? t('track.searching', 'Searching...') : t('track.btn_track', 'Track Report')}
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="py-8">
          <LoadingState message={t('track.loading_report', 'Fetching official report review record...')} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="gov-card p-6 border-red-200 bg-red-50/50 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-900">{t('track.error_title', 'Lookup Notice')}</h3>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* REPORT RESULT CARD */}
      {report && !loading && (
        <div className="gov-card p-6 sm:p-8 space-y-6 bg-white shadow-md border-slate-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {t('report.id_label', 'Report ID')}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-mono font-black text-gov-navy">
                  {report.complaint_id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Copy Report ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {t('report.summary_status', 'Current Status')}
              </span>
              <span className="inline-block mt-0.5 text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wide bg-blue-50 text-blue-800 border-blue-200">
                {report.status_label || report.status}
              </span>
            </div>
          </div>

          {/* Status Explanation Box */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-gov-navy flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                {t('track.review_status_heading', 'Review Stage Summary')}
              </span>
              <p className="text-xs text-slate-700 font-medium">
                {getStatusExplanation(report.status)}
              </p>
            </div>
          </div>

          {/* Special Status Alerts (Escalated or Closed) */}
          {report.status === 'ESCALATED' && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-300 flex items-center gap-3 text-xs text-amber-900 font-bold">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>{t('track.escalated_notice', '⚠ Escalated for further administrative review')}</span>
            </div>
          )}

          {report.status === 'FALSE_POSITIVE_INVALID' && (
            <div className="p-4 bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-3 text-xs text-slate-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <span>{t('track.closed_notice', 'Closed after review')}</span>
            </div>
          )}

          {/* VISUAL STATUS TIMELINE */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('track.timeline_title', 'Review Lifecycle Timeline')}
            </h3>

            {/* Desktop Horizontal Timeline */}
            <div className="hidden sm:grid grid-cols-5 gap-2 relative">
              {TIMELINE_STEPS.map((step, idx) => {
                const currentIdx = getTimelineStepIndex(report.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.statusKey} className="text-center relative space-y-2">
                    <div
                      className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'bg-gov-navy text-white ring-4 ring-gov-navy/20'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-bold block ${
                        isCurrent
                          ? 'text-gov-navy'
                          : isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {t(step.labelKey, step.fallback)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mobile Vertical Timeline */}
            <div className="sm:hidden space-y-3 pl-2 border-l-2 border-slate-200 ml-3">
              {TIMELINE_STEPS.map((step, idx) => {
                const currentIdx = getTimelineStepIndex(report.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.statusKey} className="relative pl-5 space-y-0.5">
                    <div
                      className={`absolute -left-[17px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-gov-navy text-white ring-2 ring-gov-navy/20'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-bold block ${
                        isCurrent ? 'text-gov-navy' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {t(step.labelKey, step.fallback)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OBSERVATION & ALLOCATION DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium block">{t('report.summary_category', 'Category')}:</span>
              <span className="font-bold text-slate-900 block">{report.category_label || report.category}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-medium block">{t('report.summary_submitted_at', 'Submitted Date')}:</span>
              <span className="font-medium text-slate-800 block">
                {new Date(report.submitted_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* PUBLIC EVIDENCE INDICATORS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-slate-500 block text-[11px] font-medium">{t('evidence.photo_title', 'Photo Evidence')}</span>
                <span className={`font-bold ${report.evidence_public_safe?.has_photo ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {report.evidence_public_safe?.has_photo 
                    ? t('evidence.photo_attached', '✓ Attached') 
                    : t('evidence.photo_none', '— None attached')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-slate-500 block text-[11px] font-medium">{t('evidence.gps_title', 'Location Reference')}</span>
                <span className={`font-bold ${report.evidence_public_safe?.has_gps ? 'text-blue-700' : 'text-slate-600'}`}>
                  {report.evidence_public_safe?.has_gps 
                    ? t('evidence.gps_captured', '✓ GPS Coordinates Provided') 
                    : t('evidence.gps_none', '— Not provided')}
                </span>
              </div>
            </div>
          </div>

          {/* LINKED ALLOCATION CONTEXT (PUBLIC-SAFE FIELDS ONLY) */}
          {report.linked_allocation_id && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gov-navy" />
                  {t('track.linked_allocation_title', 'Linked Parliamentary Allocation')}
                </span>
                <span className="font-mono font-bold text-gov-navy">{report.linked_allocation_id}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                {report.constituency && (
                  <div>
                    <span className="text-slate-500 block">{t('common.constituency', 'Constituency')}</span>
                    <span className="font-bold text-slate-800">{report.constituency}</span>
                  </div>
                )}
                {report.state && (
                  <div>
                    <span className="text-slate-500 block">{t('common.state', 'State')}</span>
                    <span className="font-bold text-slate-800">{report.state}</span>
                  </div>
                )}
                {report.mp_name && (
                  <div>
                    <span className="text-slate-500 block">{t('common.mp_name', 'Member of Parliament')}</span>
                    <span className="font-bold text-slate-800">{report.mp_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 pt-2 justify-center sm:justify-start">
            {report.linked_allocation_id && (
              <Link
                to={`/projects/${report.linked_allocation_id}`}
                className="gov-btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5" />
                {t('track.btn_view_allocation', 'View Allocation Details')}
              </Link>
            )}

            <Link
              to="/reports/new"
              className="gov-btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {t('track.link_submit_new', 'Submit Another Report')}
            </Link>

            <Link
              to="/projects"
              className="gov-btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              {t('report.btn_explore_allocations', 'Explore Allocations')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenTrackPage;
