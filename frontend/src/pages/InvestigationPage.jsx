import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Landmark, 
  Building2, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  Scale, 
  CheckCircle2, 
  Users, 
  FileCheck, 
  Printer, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Copy, 
  GitBranch, 
  Sparkles, 
  Database,
  Tag
} from 'lucide-react';
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole } from '../context/RoleContext';

export const InvestigationPage = () => {
  const { id } = useParams();
  const { isCitizen, isMP, isAuthority } = useRole();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 2.4 / P1-4: Auditor Review Triage Workflow State & Persistence
  const [reviewState, setReviewState] = useState({
    status: 'NEW',
    notes: '',
    evidenceRequested: [],
    auditTrail: [],
    lastUpdated: null
  });
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (id) {
      const savedJson = localStorage.getItem(`mplads_review_state_${id}`);
      if (savedJson) {
        try {
          const parsed = JSON.parse(savedJson);
          setReviewState({
            status: parsed.status || 'NEW',
            notes: parsed.notes || '',
            evidenceRequested: parsed.evidenceRequested || [],
            auditTrail: parsed.auditTrail || [],
            lastUpdated: parsed.lastUpdated || null
          });
        } catch (e) {
          const savedStatus = localStorage.getItem(`mplads_review_status_${id}`) || 'NEW';
          const savedNotes = localStorage.getItem(`mplads_review_notes_${id}`) || '';
          setReviewState({
            status: savedStatus,
            notes: savedNotes,
            evidenceRequested: [],
            auditTrail: [],
            lastUpdated: null
          });
        }
      } else {
        const savedStatus = localStorage.getItem(`mplads_review_status_${id}`) || 'NEW';
        const savedNotes = localStorage.getItem(`mplads_review_notes_${id}`) || '';
        setReviewState({
          status: savedStatus,
          notes: savedNotes,
          evidenceRequested: [],
          auditTrail: [],
          lastUpdated: null
        });
      }
    }
  }, [id]);

  const saveReviewState = (updatedState) => {
    setReviewState(updatedState);
    if (id) {
      localStorage.setItem(`mplads_review_state_${id}`, JSON.stringify(updatedState));
      localStorage.setItem(`mplads_review_status_${id}`, updatedState.status);
      localStorage.setItem(`mplads_review_notes_${id}`, updatedState.notes);
    }
  };

  const handleTransition = (nextStatus) => {
    const fromStatus = reviewState.status;
    const now = new Date().toISOString();
    const newEntry = {
      timestamp: now,
      fromStatus,
      toStatus: nextStatus,
      note: reviewState.notes ? reviewState.notes.slice(0, 100) : 'Status updated by auditor'
    };
    const updated = {
      ...reviewState,
      status: nextStatus,
      auditTrail: [newEntry, ...(reviewState.auditTrail || [])],
      lastUpdated: now
    };
    saveReviewState(updated);
  };

  const handleSaveNotes = () => {
    const now = new Date().toISOString();
    const updated = {
      ...reviewState,
      lastUpdated: now
    };
    saveReviewState(updated);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  const toggleEvidenceItem = (itemKey) => {
    const current = reviewState.evidenceRequested || [];
    const updatedItems = current.includes(itemKey)
      ? current.filter(k => k !== itemKey)
      : [...current, itemKey];
    const updated = {
      ...reviewState,
      evidenceRequested: updatedItems,
      lastUpdated: new Date().toISOString()
    };
    saveReviewState(updated);
  };

  const validTransitions = {
    'NEW': ['UNDER REVIEW'],
    'UNDER REVIEW': ['EVIDENCE REQUESTED', 'RESOLVED', 'FALSE POSITIVE', 'ESCALATED'],
    'EVIDENCE REQUESTED': ['UNDER REVIEW', 'RESOLVED', 'ESCALATED'],
    'RESOLVED': ['UNDER REVIEW'],
    'FALSE POSITIVE': ['UNDER REVIEW'],
    'ESCALATED': ['UNDER REVIEW']
  };

  const evidenceChecklistOptions = [
    { key: 'sanction_order', label: 'Sanction Order & Administrative Approval (MoSPI / District Authority)' },
    { key: 'utilization_cert', label: 'Audited Fund Utilization Certificate (Form GFR-19A)' },
    { key: 'work_completion_cert', label: 'Work Completion / Physical Civil Inspection Certificate' },
    { key: 'payment_vouchers', label: 'Payment Ledger Vouchers & Vendor Disbursement Records' },
    { key: 'administrative_clarification', label: 'District Authority Written Administrative Clarification' }
  ];

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ProjectsAPI.getProjectById(id);
        setData(res);
      } catch (err) {
        console.error('Failed to load project details:', err);
        setError(err.message || `Constituency allocation record '${id}' could not be loaded.`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message={`Analyzing allocation record ${id} and decomposing risk signals...`} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 space-y-4 max-w-xl mx-auto text-center">
        <div className="gov-card p-8 space-y-3 border-red-200">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Record Not Found</h2>
          <p className="text-xs text-slate-600">{error || 'Allocation record details unavailable.'}</p>
          <div className="pt-3">
            <Link to="/anomalies" className="gov-btn-primary text-xs inline-flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> {t('investigation.back_to_explorer', 'Back to Review Queue')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { 
    allocation, 
    risk_assessment, 
    reasons = [], 
    peer_comparables = [], 
    ml_cross_check, 
    risk_trajectory, 
    duplicate_candidates = [], 
    investment_durability,
    disclaimer 
  } = data;

  const getRiskTierBadge = (level, score) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return <span className="gov-badge-critical text-sm px-3 py-1 font-bold">Critical ({score})</span>;
      case 'high':
        return <span className="gov-badge-high text-sm px-3 py-1 font-bold">High Risk ({score})</span>;
      case 'medium':
        return <span className="gov-badge-medium text-sm px-3 py-1 font-semibold">Medium Risk ({score})</span>;
      default:
        return <span className="gov-badge-low text-sm px-3 py-1 font-semibold">Low Risk ({score})</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">CRITICAL</span>;
      case 'warning':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">WARNING</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200">INFO</span>;
    }
  };

  // Phase 3.2: Deterministic Natural Language Summary Generator
  const generateReasonSummary = () => {
    if (!reasons || reasons.length === 0) {
      return "This allocation sits within expected statistical cohort parameters with zero elevated anomaly signals triggered.";
    }
    const signalDetails = reasons.map((r) => {
      if (r.flag_type === 'FINANCIAL') {
        return `Reported expenditure (${r.observed_value}) exceeds the peer cohort P90 threshold (${r.threshold_value})`;
      }
      if (r.flag_type === 'TIMELINE') {
        return `A multi-term timeline retention signal is triggered (${r.observed_value})`;
      }
      if (r.flag_type === 'DATA_QUALITY') {
        return `Administrative delay / compliance remarks noted (${r.observed_value})`;
      }
      if (r.flag_type === 'GEOGRAPHIC') {
        return `Spatial density concentration in district is elevated`;
      }
      return `Potential duplicate candidate relationship flagged`;
    });
    return `Prioritized for administrative review based on ${reasons.length} analytical signal${reasons.length > 1 ? 's' : ''}: ${signalDetails.join('; ')}.`;
  };

  // Phase 1.3 G: Recommended Review Actions generation
  const getRecommendedActions = () => {
    const actions = [];
    const flagTypes = new Set(reasons.map((r) => r.flag_type));
    
    if (flagTypes.has('FINANCIAL')) {
      actions.push({
        title: 'Inspect Financial Ledger & Sanction Reconciliations',
        desc: 'Request state nodal agency itemized breakdown to clarify why reported spending deviates from peer cohort P90 baselines.'
      });
    }
    if (flagTypes.has('TIMELINE')) {
      actions.push({
        title: 'Verify Project Stagnation / Fund Return Status',
        desc: 'Issue clarification notice to district authority regarding multi-year dormant funds or active status from prior parliamentary terms.'
      });
    }
    if (flagTypes.has('DATA_QUALITY')) {
      actions.push({
        title: 'Obtain Pending Audit / Utilisation Certificates (UC)',
        desc: 'Expedite submission of pending audit reports and eligible Monthly Progress Reports (MPRs) cited in administrative delay remarks.'
      });
    }
    if (actions.length === 0) {
      actions.push({
        title: 'Routine Periodic Oversight',
        desc: 'Allocation is currently within expected statistical parameters. Maintain standard periodic review.'
      });
    }
    return actions;
  };

  const recommendedActions = getRecommendedActions();

  // Print handler for dossier
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto print:p-0 print:m-0 print:space-y-4">
      {/* Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <Link
            to="/anomalies"
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title="Return to Review Queue"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {allocation.source_record_id}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {allocation.lok_sabha_term}th Lok Sabha Session
              </span>
              {/* Review Status Badge (Authority only) */}
              {isAuthority && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                  reviewState.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  reviewState.status === 'UNDER REVIEW' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  reviewState.status === 'EVIDENCE REQUESTED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  reviewState.status === 'FALSE POSITIVE' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                  reviewState.status === 'ESCALATED' ? 'bg-red-100 text-red-800 border-red-300' :
                  'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  Triage: {reviewState.status}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {isCitizen ? "Constituency Allocation Overview" : isMP ? "Constituency Allocation Review" : "Constituency Allocation Investigation Workspace"}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {allocation.citizen_report_count > 0 && (
            <Link
              to={isAuthority ? `/authority/reports?linked_allocation_id=${encodeURIComponent(allocation.source_record_id)}` : isMP ? `/mp/reports?linked_allocation_id=${encodeURIComponent(allocation.source_record_id)}` : `/reports/track`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm"
              title="View citizen reports filed for this allocation"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>{allocation.citizen_report_count} Citizen Report{allocation.citizen_report_count > 1 ? 's' : ''}</span>
            </Link>
          )}

          <Link
            to={`/reports/new?allocation=${encodeURIComponent(allocation.source_record_id)}`}
            className="gov-btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 border-none text-xs flex items-center gap-1.5 shadow-sm font-bold"
            title="Report a civic discrepancy or observation regarding this allocation"
          >
            <FileText className="w-4 h-4 text-slate-950" />
            Report a Discrepancy
          </Link>

          <button
            onClick={handlePrintDossier}
            className="gov-btn-secondary text-xs flex items-center gap-1.5 shadow-sm font-semibold"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            {t('investigation.print_dossier', 'Print Case Dossier')}
          </button>
        </div>
      </div>

      {/* Printable Audit Case File Banner (Visible on Screen in Print Mode) */}
      <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
              MPLADS Samiksha — Analytical Review Dossier
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Internal Administrative Review Case File | Generated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-mono font-bold text-slate-900 block">Record Key: {allocation.source_record_id}</span>
            <span className="text-slate-600">{allocation.lok_sabha_term}th Lok Sabha | {allocation.constituency}, {allocation.state}</span>
          </div>
        </div>
      </div>

      {/* Quick Triage Status Header Pill (Authority only) */}
      {isAuthority && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gov-navy" />
            <span className="text-xs font-bold text-slate-800">Current Review Disposition:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
              reviewState.status === 'UNDER REVIEW' ? 'bg-blue-100 text-blue-900 border-blue-300' :
              reviewState.status === 'EVIDENCE REQUESTED' ? 'bg-amber-100 text-amber-900 border-amber-300' :
              reviewState.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
              reviewState.status === 'FALSE POSITIVE' ? 'bg-purple-100 text-purple-900 border-purple-300' :
              reviewState.status === 'ESCALATED' ? 'bg-red-100 text-red-900 border-red-300' :
              'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              {reviewState.status}
            </span>
          </div>
          <a
            href="#auditor-review-workflow"
            className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1"
          >
            Manage Workflow &amp; Evidence Checklist ↓
          </a>
        </div>
      )}

      {/* Phase 3.2: Deterministic Natural Language Reason Summary */}
      <div className="p-4 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold text-gov-navy">
          <Sparkles className="w-4 h-4 text-gov-navy" />
          Deterministic Signal Summary (Phase 3.2)
        </div>
        <p className="text-xs text-slate-800 leading-relaxed font-medium">
          {generateReasonSummary()}
        </p>
      </div>

      {/* Primary Top Risk Summary Card (Phase 1.3 A) */}
      <div className="gov-card p-6 border-l-4 border-l-gov-navy bg-gradient-to-r from-slate-50 to-white shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Analytical Prioritization Signal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-medium text-slate-600">Model A Frozen Engine</span>
            </div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black text-slate-900">
                Risk Score: {risk_assessment.total_score} / 100
              </h2>
              {getRiskTierBadge(risk_assessment.risk_level, risk_assessment.total_score)}
            </div>
            <p className="text-xs text-slate-600">
              Allocated to <strong>{allocation.mp_name}</strong> in {allocation.constituency} ({allocation.state})
            </p>
          </div>

          <div className="text-right flex flex-col md:items-end space-y-1 text-xs">
            <span className="text-slate-500 font-medium">Constituency Allocation Key:</span>
            <code className="text-xs font-mono font-bold text-gov-navy bg-slate-100 px-2.5 py-1 rounded">
              {allocation.source_record_id}
            </code>
            <span className="text-[11px] text-slate-400">
              *Derived dataset index key, not official work ID
            </span>
          </div>
        </div>
      </div>

      {/* Citizen Discrepancy Reporting Callout */}
      <div className="gov-card p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gov-navy" />
            <h3 className="text-sm font-bold text-slate-900">Have an on-ground observation about this allocation?</h3>
          </div>
          <p className="text-xs text-slate-600">
            Submit a public observation or discrepancy report to assist authorities in administrative review.
          </p>
        </div>
        <Link
          to={`/reports/new?allocation=${encodeURIComponent(allocation.source_record_id)}`}
          className="gov-btn-primary bg-gov-navy hover:bg-gov-navyLight text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm flex-shrink-0"
        >
          <FileText className="w-4 h-4" />
          Report a Discrepancy
        </Link>
      </div>

      {/* Entity Metadata & Financial Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* {t('investigation.administrative_details', 'Parliamentary Entity Metadata')} */}
        <div className="gov-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Landmark className="w-4 h-4 text-gov-navy" />
            {t('investigation.administrative_details', 'Parliamentary Entity Metadata')}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">{t('common.mp_name', 'Member of Parliament')}</span>
              <span className="text-sm font-bold text-slate-900 block">{allocation.mp_name}</span>
              <span className="text-[11px] text-slate-500">{allocation.house} ({allocation.lok_sabha_term}th Lok Sabha)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">{t('common.constituency', 'Constituency')}</span>
                <span className="font-semibold text-slate-800">{allocation.constituency || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">{t('common.state', 'State / UT')}</span>
                <span className="font-semibold text-slate-800">{allocation.state}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">{t('common.district', 'District (Centroid)')}</span>
                <span className="font-semibold text-slate-800">{allocation.district}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">{t('common.category', 'Civic Sector')}</span>
                <span className="font-semibold text-slate-800">{allocation.category}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500 block font-medium">{t('common.status', 'Lifecycle Status')}</span>
              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                {allocation.status}
              </span>
            </div>

            {allocation.pending_reason && (
              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                  Official Administrative Remark:
                </span>
                <p className="text-[11px] leading-relaxed">{allocation.pending_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Highlights & Progress Card */}
        <div className="gov-card p-6 space-y-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-gov-navy" />
              {t('investigation.financial_breakdown', 'Financial Deployment Profile')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">{t('common.sanctioned', 'Sanctioned Works Budget')}</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">₹{allocation.sanctioned_cost.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Total approved</span>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="text-[11px] text-gov-navy block font-medium">{t('common.expenditure', 'Reported Expenditure')}</span>
                <span className="text-lg font-black text-gov-navy mt-1 block">₹{allocation.expenditure.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Cumulative incurred</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-800 block font-medium">Released by MoSPI</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">₹{allocation.released_amount.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Disbursed funds</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-800 block font-medium">{t('map.unspent_balance', 'Unspent Balance')}</span>
                <span className="text-lg font-black text-amber-700 mt-1 block">₹{allocation.unspent_balance.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Remaining in account</span>
              </div>
            </div>

            {/* Financial Utilization Progress Meter */}
            <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  Financial Utilization Proxy — expenditure / sanctioned cost × 100:
                  <span title="Proxy calculated as (expenditure / sanctioned_cost) * 100. Strictly does not represent physical civil construction completion.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </span>
                </span>
                <span className="font-black text-sm text-gov-navy">{allocation.financial_utilization.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    allocation.financial_utilization >= 90
                      ? 'bg-emerald-500'
                      : allocation.financial_utilization >= 50
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, allocation.financial_utilization)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                *Financial utilization is a proxy based on expenditure and sanctioned cost and does not represent physical work progress.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Model A Risk Fingerprint & 5-Dimension Decomposition (Phase 1.3 B) */}
      <div className="gov-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-gov-navy" />
              Model A Risk Fingerprint Decomposition (Max 100 Points)
            </h3>
            <p className="text-xs text-slate-500">Pure linear additive formulation: FIN (35) + TIM (25) + DQ (20) + GEO (10) + DUP (10)</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Computed: {risk_assessment.computed_at?.split('T')[0]}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Financial Deviation */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Financial</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.financial_score} / 35</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gov-navy h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.financial_score / 35) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">P90 peer deviation</p>
          </div>

          {/* Timeline Stagnation */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Timeline</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.timeline_score} / 25</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gov-navyLight h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.timeline_score / 25) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Prior-term retention</p>
          </div>

          {/* Data Quality */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Compliance</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.data_quality_score} / 20</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.data_quality_score / 20) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Audit/MPR notes</p>
          </div>

          {/* Geographic */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Geographic</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.geographic_score} / 10</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.geographic_score / 10) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Spatial density</p>
          </div>

          {/* Duplicate Candidate */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Duplicate</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.duplicate_score || 0} / 10</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-500 h-1.5 rounded-full"
                style={{ width: `${((risk_assessment.duplicate_score || 0) / 10) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Deduplication test</p>
          </div>
        </div>
      </div>

      {/* Phase 2.3 & 2.6: Risk Trajectory & Offline ML Cross-Check Cards */}
      {/* Phase 2.3 & 2.6: Risk Trajectory & Offline ML Cross-Check Cards */}
      <div className="space-y-6">
        {/* Phase 2.6 / P1-6: Cross-Term Allocation Intelligence & Empirical Trajectory */}
        <div className="gov-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-gov-navy" />
                Cross-Term Allocation Intelligence &amp; Trajectory (P1-6)
              </h3>
              <p className="text-xs text-slate-500">
                Comparative longitudinal intelligence across 15th, 16th, and 17th Lok Sabha parliamentary terms for {allocation.constituency}
              </p>
            </div>
            {risk_trajectory && (
              <span className={`text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider ${
                risk_trajectory.trajectory_status === 'ESCALATING' ? 'bg-red-100 text-red-900 border-red-300' :
                risk_trajectory.trajectory_status === 'ELEVATED' ? 'bg-red-100 text-red-900 border-red-300' :
                risk_trajectory.trajectory_status === 'IMPROVING' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                risk_trajectory.trajectory_status === 'STABLE' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                Trajectory: {risk_trajectory.trajectory_status}
              </span>
            )}
          </div>

          {/* Cross-Term Governance & Separation Banner */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Cross-Term Comparative Intelligence Scope:</p>
            <p className="leading-relaxed">
              Cross-term intelligence compares available allocation records associated with the same constituency ({allocation.constituency}) across parliamentary terms. Comparable records do not necessarily represent the same physical work. Observed changes are descriptive and do not establish causation or wrongdoing.
            </p>
          </div>

          {/* Early Warning Alert Banner */}
          {risk_trajectory?.early_warning_signal && (
            <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Empirical Early-Warning Review Signal: </span>
                {risk_trajectory.early_warning_signal}
              </div>
            </div>
          )}

          {/* 3-Term Comparison Cards Grid (15th, 16th, 17th Lok Sabha) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[15, 16, 17].map((termNum) => {
              const pt = risk_trajectory?.observed_points?.find((p) => p.term === termNum);
              const isCurrent = pt && pt.source_record_id === allocation.source_record_id;

              if (pt) {
                return (
                  <div
                    key={termNum}
                    className={`p-4 rounded-lg border space-y-3 flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-blue-50/60 border-gov-navy shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-900">
                          {termNum}th Lok Sabha
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] font-bold bg-gov-navy text-white px-2 py-0.5 rounded">
                            Current Record
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            Comparable Record
                          </span>
                        )}
                      </div>

                      <div>
                        <Link
                          to={`/projects/${pt.source_record_id}`}
                          className="font-mono text-xs font-bold text-gov-navy hover:underline"
                        >
                          {pt.source_record_id}
                        </Link>
                        <h4 className="text-xs font-semibold text-slate-800 mt-0.5">{pt.mp_name}</h4>
                        <span className="text-[10px] text-slate-500 block">{pt.category || allocation.category}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sanctioned:</span>
                          <span className="font-semibold text-slate-800">₹{pt.sanctioned_cost.toFixed(2)} Cr</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Reported Spent:</span>
                          <span className="font-semibold text-slate-800">₹{pt.expenditure.toFixed(2)} Cr</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Utilization Proxy:</span>
                          <span className="font-semibold text-gov-navy">{pt.financial_utilization.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Model A Score:</span>
                          <span className={`font-bold ${pt.total_score >= 50 ? 'text-red-700' : pt.total_score >= 25 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {pt.total_score} ({pt.risk_level})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate" title={pt.primary_flag}>
                      <span className="font-medium text-slate-700">Signal: </span>
                      {pt.primary_flag}
                    </div>
                  </div>
                );
              }

              return (
                <div key={termNum} className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-center text-center">
                  <span className="text-xs font-bold text-slate-400">{termNum}th Lok Sabha</span>
                  <p className="text-[11px] text-slate-400 italic">
                    No comparable allocation record available for this term in the validated open dataset.
                  </p>
                </div>
              );
            })}
          </div>

          {/* Cross-Term Financial & Risk Progression Deltas Strip */}
          {risk_trajectory?.observed_points && risk_trajectory.observed_points.length >= 2 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-gov-navy" />
                  Cross-Term Progression Analytics (Consecutive Observed Terms)
                </span>
                <span className="text-[10px] text-slate-500">
                  Formula: ((current - previous) / previous) × 100
                </span>
              </div>

              {(() => {
                const sorted = [...risk_trajectory.observed_points].sort((a, b) => a.term - b.term);
                const prev = sorted[sorted.length - 2];
                const curr = sorted[sorted.length - 1];
                const sancDelta = curr.sanctioned_cost - prev.sanctioned_cost;
                const sancPct = prev.sanctioned_cost > 0 ? `${((sancDelta / prev.sanctioned_cost) * 100).toFixed(1)}%` : 'N/A';
                const expDelta = curr.expenditure - prev.expenditure;
                const expPct = prev.expenditure > 0 ? `${((expDelta / prev.expenditure) * 100).toFixed(1)}%` : 'N/A';
                const unspentDelta = (curr.unspent_balance || 0) - (prev.unspent_balance || 0);
                const utilDelta = curr.financial_utilization - prev.financial_utilization;
                const scoreDelta = curr.total_score - prev.total_score;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Sanctioned Budget Change:</span>
                      <span className={`text-sm font-bold block ${sancDelta >= 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {sancDelta >= 0 ? `+₹${sancDelta.toFixed(2)}` : `-₹${Math.abs(sancDelta).toFixed(2)}`} Cr
                      </span>
                      <span className="text-[10px] text-slate-400">({sancPct})</span>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Reported Spending Change:</span>
                      <span className={`text-sm font-bold block ${expDelta >= 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {expDelta >= 0 ? `+₹${expDelta.toFixed(2)}` : `-₹${Math.abs(expDelta).toFixed(2)}`} Cr
                      </span>
                      <span className="text-[10px] text-slate-400">({expPct})</span>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Unspent Balance Delta:</span>
                      <span className="text-sm font-bold block text-slate-900">
                        {unspentDelta >= 0 ? `+₹${unspentDelta.toFixed(2)}` : `-₹${Math.abs(unspentDelta).toFixed(2)}`} Cr
                      </span>
                      <span className="text-[10px] text-slate-400">Net unspent</span>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Utilization Proxy Delta:</span>
                      <span className={`text-sm font-bold block ${utilDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {utilDelta >= 0 ? `+${utilDelta.toFixed(1)}%` : `${utilDelta.toFixed(1)}%`}
                      </span>
                      <span className="text-[10px] text-slate-400">Percentage points</span>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Model A Score Delta:</span>
                      <span className={`text-sm font-bold block ${
                        scoreDelta >= 10 ? 'text-red-700' : scoreDelta <= -10 ? 'text-emerald-700' : 'text-blue-700'
                      }`}>
                        {scoreDelta >= 0 ? `+${scoreDelta.toFixed(1)}` : scoreDelta.toFixed(1)} pts
                      </span>
                      <span className="text-[10px] text-slate-400">({risk_trajectory.trajectory_status})</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500 italic">
              Single-term record observed ({allocation.lok_sabha_term}th Lok Sabha). Insufficient cross-term history for multi-term progression comparison.
            </div>
          )}

          {/* Historical Observation Progression Points Table */}
          {risk_trajectory?.observed_points && risk_trajectory.observed_points.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">
                  Cross-Term Allocation Table ({risk_trajectory.observed_points.length} Sessions Observed)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Basis: {risk_trajectory.longitudinal_grouping_basis}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 text-left font-bold">Parliamentary Term</th>
                      <th className="p-2 text-left font-bold">Record ID</th>
                      <th className="p-2 text-left font-bold">Member of Parliament</th>
                      <th className="p-2 text-right font-bold">Sanctioned</th>
                      <th className="p-2 text-right font-bold">Reported Spent</th>
                      <th className="p-2 text-right font-bold">Unspent</th>
                      <th className="p-2 text-center font-bold">Utilization</th>
                      <th className="p-2 text-center font-bold">Model A Score</th>
                      <th className="p-2 text-left font-bold">Primary Reason Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {risk_trajectory.observed_points.map((pt) => {
                      const isCurrentRecord = pt.source_record_id === allocation.source_record_id;
                      return (
                        <tr key={pt.source_record_id} className={isCurrentRecord ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'}>
                          <td className="p-2 font-bold text-slate-900">
                            {pt.term_label}
                            {isCurrentRecord && <span className="ml-1.5 text-[10px] bg-gov-navy text-white px-1.5 py-0.2 rounded">Current</span>}
                          </td>
                          <td className="p-2 font-mono text-gov-navy">
                            <Link to={`/projects/${pt.source_record_id}`} className="hover:underline">
                              {pt.source_record_id}
                            </Link>
                          </td>
                          <td className="p-2 text-slate-800">{pt.mp_name}</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{pt.sanctioned_cost.toFixed(2)} Cr</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{pt.expenditure.toFixed(2)} Cr</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{(pt.unspent_balance || 0).toFixed(2)} Cr</td>
                          <td className="p-2 text-center font-mono text-slate-800">{pt.financial_utilization.toFixed(1)}%</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              pt.total_score >= 50 ? 'bg-red-100 text-red-800 border border-red-200' :
                              pt.total_score >= 25 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {pt.total_score} ({pt.risk_level})
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 truncate max-w-xs" title={pt.primary_flag}>
                            {pt.primary_flag}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 gap-1">
            <span>Observed Sessions: {risk_trajectory?.terms_observed?.map(t => `${t}th LS`).join(', ') || `${allocation.lok_sabha_term}th LS`}</span>
            <span className="italic">*{risk_trajectory?.disclaimer || "Historical empirical trajectory based on observed Lok Sabha parliamentary terms. Not a predictive future forecast."}</span>
          </div>
        </div>

        {/* Offline Isolation Forest ML Cross-Check (Phase 2.6) */}
        <div className="gov-card p-6 space-y-3">
          <div className="flex justify-between items-start pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gov-navy" />
                Analytical ML Cross-Check (Phase 2.6)
              </h3>
              <p className="text-xs text-slate-500">
                Offline Isolation Forest benchmark validation
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-gov-navy border border-blue-200">
              Agreement: {ml_cross_check?.agreement ? 'Consistent' : 'Divergent'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Production Model A:</span>
              <span className="font-bold text-slate-900">{risk_assessment.risk_level} Risk ({risk_assessment.total_score})</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Offline ML Assessment:</span>
              <span className="font-bold text-slate-900">{ml_cross_check?.anomalous ? 'Anomalous Signal' : 'Normal Baseline'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
            *{ml_cross_check?.disclaimer || "Isolation Forest is used as an offline analytical cross-check and does not modify the production risk score."}
          </p>
        </div>
      </div>

      {/* Phase B: Investment–Durability Review Signal Card */}
      {investment_durability && (
        <div className="gov-card p-6 space-y-4 border-l-4 border-l-indigo-600 bg-gradient-to-r from-slate-50 to-white shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                {t('durability.title', 'Investment–Durability Review Signal')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('durability.sub', 'Comparative screening heuristic evaluating public investment against citizen condition observations')}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider ${
              investment_durability.signal_status === 'HIGH_INVESTMENT_CONDITION_CONCERN' ? 'bg-amber-100 text-amber-900 border-amber-300' :
              investment_durability.signal_status === 'HIGH_INVESTMENT_REPEATED_CONCERNS' ? 'bg-red-100 text-red-900 border-red-300' :
              investment_durability.signal_status === 'INVESTMENT_CONDITION_MONITORED' ? 'bg-blue-100 text-blue-900 border-blue-300' :
              investment_durability.signal_status === 'INVESTMENT_CONDITION_NORMAL' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
              'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {t('durability.review_signal', 'Review Signal:')} {investment_durability.signal_badge}
            </span>
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">{t('durability.investment_level', 'Investment Level:')}</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                ₹{(investment_durability.sanctioned_cost_crore || investment_durability.expenditure_crore || 0).toFixed(2)} Cr
              </span>
              <span className="text-[10px] text-slate-400">{investment_durability.category}</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">{t('durability.category_benchmark', 'Category Cohort Benchmark:')}</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {investment_durability.investment_level}
              </span>
              <span className="text-[10px] text-slate-400">
                P50: ₹{investment_durability.category_median_cost_crore?.toFixed(2)} Cr | P90: ₹{investment_durability.category_p90_cost_crore?.toFixed(2)} Cr
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">{t('durability.condition_observations', 'Condition Observations:')}</span>
              <span className={`text-base font-bold mt-0.5 block ${investment_durability.condition_reports_count > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                {investment_durability.condition_reports_count > 0 
                  ? `${investment_durability.condition_reports_count} report(s)` 
                  : t('durability.no_reports', '0 condition reports')}
              </span>
              <span className="text-[10px] text-slate-400 truncate block" title={investment_durability.relevant_categories?.join(', ')}>
                {investment_durability.relevant_categories?.length > 0 ? investment_durability.relevant_categories.join(', ') : 'No flags'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">{t('durability.elapsed_period', 'Elapsed Milestone Period:')}</span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {investment_durability.elapsed_time_description}
              </span>
              <span className="text-[10px] text-slate-400">
                {t('durability.screening_window_note', 'Descriptive duration from recorded project milestone')}
              </span>
            </div>
          </div>

          {/* Signal Review Rationale */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {t('durability.reason_title', 'Signal Review Rationale:')}
              </span>
              {investment_durability.has_repeated_reports && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  {t('durability.repeated_reports_note', 'Multiple reports associated with this allocation')}
                </span>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              {investment_durability.signal_reason}
            </p>
          </div>

          {/* Safe AI Disclaimer */}
          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
            *{t('durability.disclaimer', 'Analytical review signal only. Citizen reports are observations requiring verification and do not establish physical deterioration or wrongdoing.')}
          </p>
        </div>
      )}

      {/* Evidence Completeness Matrix (Phase 1.4) */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-start pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gov-navy" />
              Evidence Completeness Matrix (Phase 1.4)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates available supporting documentation vs information requiring verification
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
            Audit Context Layer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Evidence Available */}
          <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Evidence Available in Dataset
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li><strong>Sanctioned Works Budget:</strong> ₹{allocation.sanctioned_cost.toFixed(2)} Cr approved by MoSPI</li>
              <li><strong>Reported Expenditure:</strong> ₹{allocation.expenditure.toFixed(2)} Cr cumulative incurred</li>
              <li><strong>Fund Releases & Unspent:</strong> ₹{allocation.released_amount.toFixed(2)} Cr released; ₹{allocation.unspent_balance.toFixed(2)} Cr unspent</li>
              <li><strong>Parliamentary Term:</strong> {allocation.lok_sabha_term}th Lok Sabha attribution</li>
              <li><strong>District Context:</strong> {allocation.district} centroid reference</li>
              {allocation.pending_reason && (
                <li><strong>Administrative Delay Remarks:</strong> {allocation.pending_reason}</li>
              )}
            </ul>
          </div>

          {/* Evidence Missing / Requiring Verification */}
          <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Evidence Missing / Requiring Verification
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li><strong>Transaction-Level Invoices:</strong> Vendor payment vouchers and RTGS numbers not in public open data</li>
              <li><strong>Physical Civil Milestones:</strong> Engineering on-site completion % requires physical inspection certificate</li>
              <li><strong>Micro Site GPS:</strong> Location represents district centroid; individual worksite GPS not present</li>
              <li><strong>Field Audit Notes:</strong> Local district authority site inspection logs</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-slate-100 rounded text-[11px] text-slate-600 italic">
          <strong>Institutional Note:</strong> Missing evidence indicates the need for administrative verification; it does not constitute proof of wrongdoing.
        </div>
      </div>

      {/* Explainable Reason Cards Section (Phase 1.3 D) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Explainable Reason Signals ({reasons.length})
          </h3>
          <span className="text-xs text-slate-500">Deterministic decomposition against peer cohort baselines</span>
        </div>

        {reasons.length === 0 ? (
          <div className="gov-card p-6 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No elevated risk signals triggered.</p>
            <p className="text-xs text-slate-400 mt-1">This allocation sits within expected statistical cohort parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reasons.map((r, index) => (
              <div key={index} className="gov-card p-5 space-y-3 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {r.flag_type} SIGNAL
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{r.title}</h4>
                  </div>
                  {getSeverityBadge(r.severity)}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                  {r.explanation}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Observed:</span>
                    <span className="font-bold text-slate-800">{r.observed_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Baseline:</span>
                    <span className="font-medium text-slate-600">{r.baseline_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Threshold:</span>
                    <span className="font-mono text-slate-600">{r.threshold_value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 2.5: Duplicate Candidates / Possible Related Allocations */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-start pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-4 h-4 text-gov-navy" />
              Possible Related Allocations & Deduplication Analysis (Phase 2.5)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates allocations sharing matching constituency, category, or identical sanctioned cost parameters
            </p>
          </div>
          <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
            Deduplication Layer
          </span>
        </div>

        {duplicate_candidates.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
            Deduplication analysis completed; no similar allocations were identified in the validated dataset.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {duplicate_candidates.map((cand) => (
              <div key={cand.candidate_id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <Link to={`/projects/${cand.candidate_id}`} className="font-mono text-xs font-bold text-gov-navy hover:underline">
                      {cand.candidate_id}
                    </Link>
                    <span className="text-[10px] text-slate-500">{cand.lok_sabha_term}th Lok Sabha</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 mt-1">{cand.mp_name}</h5>
                  <p className="text-[11px] text-slate-500">{cand.constituency} ({cand.category})</p>

                  <div className="mt-2 text-[11px] space-y-1 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700 block">Similarity Dimensions:</span>
                    <ul className="list-disc list-inside text-slate-600">
                      {cand.similarity_reasons?.map((sr, idx) => (
                        <li key={idx}>{sr}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic">
                  *{cand.disclaimer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 2.4 / P1-4: Auditor Review Triage Workflow (Authority Officers only) */}
      {isAuthority && (
        <div id="auditor-review-workflow" className="gov-card p-6 space-y-6 border-2 border-slate-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-gov-navy" />
              Auditor Review Triage Workflow (P1-4)
            </h3>
            <p className="text-xs text-slate-500">
              Administrative workflow tracking human review disposition following analytical risk assessment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Review Status:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider ${
              reviewState.status === 'UNDER REVIEW' ? 'bg-blue-100 text-blue-900 border-blue-300' :
              reviewState.status === 'EVIDENCE REQUESTED' ? 'bg-amber-100 text-amber-900 border-amber-300' :
              reviewState.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
              reviewState.status === 'FALSE POSITIVE' ? 'bg-purple-100 text-purple-900 border-purple-300' :
              reviewState.status === 'ESCALATED' ? 'bg-red-100 text-red-900 border-red-300' :
              'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              {reviewState.status}
            </span>
          </div>
        </div>

        {/* Critical Separation Architecture Banner */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-2.5 bg-white rounded border border-slate-200">
            <span className="text-[10px] font-bold text-gov-navy uppercase tracking-wider block">
              1. Analytical Risk Assessment (Model A - Frozen)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Score: {risk_assessment.total_score} / 100 ({risk_assessment.risk_level} Risk)
              </span>
              <span className="text-[10px] text-slate-500">
                • {reasons.length} active review flags
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Deterministic mathematical signals; immutable across workflow state changes.
            </p>
          </div>

          <div className="p-2.5 bg-white rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
              2. Human Review Disposition (Administrative Metadata)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Current State: {reviewState.status}
              </span>
              {reviewState.lastUpdated && (
                <span className="text-[10px] text-slate-500">
                  • Updated {new Date(reviewState.lastUpdated).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Reviewer tracking layer; does not rewrite or alter production risk scores.
            </p>
          </div>
        </div>

        {/* Workflow State Lifecycle & Action Buttons */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-800 block">
            Update Workflow Disposition (Enforced Transitions)
          </span>

          <div className="flex flex-wrap gap-2">
            {/* Allowed Next Actions */}
            {validTransitions[reviewState.status]?.map((nextState) => (
              <button
                key={nextState}
                type="button"
                onClick={() => handleTransition(nextState)}
                className={`text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1.5 ${
                  nextState === 'UNDER REVIEW' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  nextState === 'EVIDENCE REQUESTED' ? 'bg-amber-600 text-white hover:bg-amber-700' :
                  nextState === 'RESOLVED' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                  nextState === 'FALSE POSITIVE' ? 'bg-purple-600 text-white hover:bg-purple-700' :
                  nextState === 'ESCALATED' ? 'bg-red-600 text-white hover:bg-red-700' :
                  'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                <span>Transition to:</span>
                <strong>{nextState}</strong>
              </button>
            ))}

            {/* Quick Reset / Reopen option for terminal states */}
            {['RESOLVED', 'FALSE POSITIVE', 'ESCALATED'].includes(reviewState.status) && (
              <button
                type="button"
                onClick={() => handleTransition('UNDER REVIEW')}
                className="text-xs font-semibold px-3 py-1.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Reopen for Review
              </button>
            )}
          </div>
        </div>

        {/* Evidence Verification Checklist */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-gov-navy" />
              Evidence Verification Request Checklist
            </h4>
            <span className="text-[11px] text-slate-500">
              {reviewState.evidenceRequested?.length || 0} items requested
            </span>
          </div>

          <div className="space-y-2">
            {evidenceChecklistOptions.map((opt) => {
              const isChecked = reviewState.evidenceRequested?.includes(opt.key);
              return (
                <label key={opt.key} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEvidenceItem(opt.key)}
                    className="rounded text-gov-navy focus:ring-gov-navy"
                  />
                  <span className={isChecked ? 'font-semibold text-slate-900' : ''}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200">
            *Evidence verification checklist serves as an administrative audit request and does not imply missing records or wrongdoing.
          </p>
        </div>

        {/* Auditor Notes Text Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800">
              Auditor Triage Notes &amp; Disposition Rationale
            </label>
            {notesSaved && (
              <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
                ✓ Notes saved to review profile
              </span>
            )}
          </div>

          <textarea
            value={reviewState.notes}
            onChange={(e) => setReviewState({ ...reviewState, notes: e.target.value })}
            placeholder="Document specific verification findings, requested supporting vouchers, or administrative resolution rationale..."
            rows={3}
            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-transparent font-sans"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="text-xs font-bold px-4 py-1.5 rounded bg-gov-navy text-white hover:bg-gov-navyLight transition-colors"
            >
              Save Review Notes
            </button>
          </div>
        </div>

        {/* Audit Trail History */}
        {reviewState.auditTrail && reviewState.auditTrail.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-600" />
              Review Lifecycle Audit Trail ({reviewState.auditTrail.length} Events)
            </h4>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
              {reviewState.auditTrail.map((entry, idx) => (
                <div key={idx} className="text-[11px] p-2 bg-white rounded border border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-800">
                      {entry.fromStatus} → {entry.toStatus}
                    </span>
                    {entry.note && (
                      <span className="text-slate-500 italic max-w-xs truncate" title={entry.note}>
                        ({entry.note})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">Auditor Action</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic">
          *Human review disposition is administrative review metadata and does not modify the underlying Model A risk score, risk tier, or analytical flags.
        </div>
      </div>
      )}

      {/* Recommended Review Actions (Phase 1.3 G) */}
      <div className="gov-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-gov-navy" />
          Recommended Review Actions for Auditor
        </h3>

        <div className="space-y-3">
          {recommendedActions.map((action, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-gov-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">{action.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{action.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peer Cohort Comparable Table */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gov-navy" />
              Peer Cohort Comparables
            </h3>
            <p className="text-xs text-slate-500">
              Allocations with similar sanctioned works budgets in the same civic sector ({allocation.category})
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Peer Record ID</th>
                <th>Member of Parliament</th>
                <th>{t('common.constituency', 'Constituency')}</th>
                <th className="text-right">Sanctioned Budget</th>
                <th className="text-right">Reported Spent</th>
                <th className="text-right">Utilization</th>
                <th className="text-center">Risk Assessment</th>
              </tr>
            </thead>
            <tbody>
              {peer_comparables.map((peer) => (
                <tr key={peer.source_record_id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-mono text-xs font-semibold text-gov-navy">
                    <Link to={`/projects/${peer.source_record_id}`} className="hover:underline">
                      {peer.source_record_id}
                    </Link>
                  </td>
                  <td className="font-medium text-slate-900">{peer.mp_name}</td>
                  <td className="text-slate-600">{peer.constituency}</td>
                  <td className="text-right">₹{peer.sanctioned_cost.toFixed(2)} Cr</td>
                  <td className="text-right font-semibold text-slate-800">₹{peer.expenditure.toFixed(2)} Cr</td>
                  <td className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                      {peer.financial_utilization.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`gov-badge ${peer.risk_level === 'High' ? 'gov-badge-high' : peer.risk_level === 'Medium' ? 'gov-badge-medium' : 'gov-badge-low'}`}>
                      {peer.risk_level} ({peer.total_score})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 3.3: Verified Data Provenance Display */}
      <div className="gov-card p-6 space-y-3 bg-slate-50 border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
          <Database className="w-4 h-4 text-gov-navy" />
          Verified Source Data Provenance (Phase 3.3)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Source Dataset:</span>
            <span className="font-semibold text-slate-800">MoSPI MPLADS Portal Release</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Parliamentary Session:</span>
            <span className="font-semibold text-slate-800">{allocation.lok_sabha_term}th Lok Sabha</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Ingestion Record Key:</span>
            <span className="font-mono font-semibold text-slate-800">{allocation.source_record_id}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">District Centroid Match:</span>
            <span className="font-semibold text-slate-800">{allocation.district}, {allocation.state}</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 italic">
          *source_record_id represents an authentic dataset index identifier generated during ingestion. Granular invoice-level payment vouchers and contractor GSTIN registries are not present in public open data.
        </p>
      </div>

      {/* Responsible AI Disclaimer */}
      <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Responsible AI & Analytical Governance Statement:</p>
        <p className="leading-relaxed">{disclaimer || "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."}</p>
      </div>
    </div>
  );
};

export default InvestigationPage;
