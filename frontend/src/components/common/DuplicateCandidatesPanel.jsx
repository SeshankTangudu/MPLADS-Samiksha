import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  ExternalLink,
  AlertCircle,
  Info,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Shield,
  Search,
} from 'lucide-react';
import { AnalyticsAPI } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

// ────────────────────────────────────────────────────────────────────────────
// DuplicateCandidatesPanel
//
// Displays structural similarity candidates for human review.
//
// CLAIM SAFETY — Must display:
//   "Similarity indicates a review candidate, not a confirmed duplicate or wrongdoing."
//   "Candidate matches are analytical signals intended to support human verification."
//   "Requires Human Verification"
//
// This panel must NEVER:
//   - claim confirmed duplicates
//   - claim fraud or wrongdoing
//   - present the similarity score as fraud/risk probability
//   - modify any production records
// ────────────────────────────────────────────────────────────────────────────

const FIELD_LABELS = {
  constituency: 'Constituency',
  category: 'Sector / Category',
  lok_sabha_term: 'Lok Sabha Term',
  sanctioned_cost: 'Sanctioned Cost',
};

const SimilarityBadge = ({ score }) => {
  const pct = Math.round(score * 100);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"
      title="Similarity Score — NOT a fraud or duplicate probability"
    >
      <Search size={11} />
      Similarity {pct}%
    </span>
  );
};

const RecordCard = ({ record, label }) => (
  <div className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <Link
        to={record.investigate_url}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        title="Open full investigation workspace"
      >
        Investigate <ExternalLink size={11} />
      </Link>
    </div>
    <div><span className="text-slate-500">{t('common.mp_name', 'MP')}:</span> <span className="font-medium text-slate-800">{record.mp_name}</span></div>
    <div><span className="text-slate-500">{t('common.constituency', 'Constituency')}:</span> <span className="font-medium">{record.constituency}</span></div>
    <div><span className="text-slate-500">{t('common.district', 'District')}:</span> {record.district}</div>
    <div><span className="text-slate-500">{t('common.state', 'State')}:</span> {record.state}</div>
    <div><span className="text-slate-500">Term:</span> {record.lok_sabha_term}th Lok Sabha</div>
    <div><span className="text-slate-500">Sanctioned:</span> <span className="font-semibold text-slate-800">₹{record.sanctioned_cost.toFixed(2)} Cr</span></div>
    <div><span className="text-slate-500">Expenditure:</span> ₹{record.expenditure.toFixed(2)} Cr</div>
    <div><span className="text-slate-500">Status:</span> <span className="italic">{record.status}</span></div>
    <div className="pt-1 text-xs text-slate-400">Source ID: {record.source_record_id}</div>
  </div>
);

const CandidatePairCard = ({ pair, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-bold text-amber-700">
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {pair.record_a.constituency} — {pair.record_a.category}
            </p>
            <p className="text-xs text-slate-500">
              Term {pair.record_a.lok_sabha_term} · ₹{pair.record_a.sanctioned_cost.toFixed(2)} Cr ·{' '}
              <span className="text-amber-700 font-medium">{pair.candidate_label}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SimilarityBadge score={pair.similarity_score} />
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium border border-amber-300 rounded px-2 py-0.5 bg-amber-50">
            <CheckSquare size={11} /> Requires Verification
          </span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-amber-100 px-4 py-4 space-y-4">
          {/* Matched fields */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Matched Fields</p>
            <div className="flex flex-wrap gap-2">
              {pair.matched_fields.map(f => (
                <span key={f} className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  {FIELD_LABELS[f] || f}
                </span>
              ))}
            </div>
          </div>

          {/* Two record cards side-by-side */}
          <div className="flex flex-col sm:flex-row gap-3">
            <RecordCard record={pair.record_a} label="Record A" />
            <RecordCard record={pair.record_b} label="Record B" />
          </div>

          {/* Rationale */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-700 mb-1">Matching Rationale</p>
            <p>{pair.matching_rationale}</p>
          </div>

          {/* Human verification notice */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Requires Human Verification.</strong> This pair is a review candidate only.
              Similarity does not confirm duplication or constitute evidence of wrongdoing.
              Pair ID: <code className="font-mono">{pair.pair_id}</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const DuplicateCandidatesPanel = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    AnalyticsAPI.getDuplicateCandidates()
      .then(res => { setData(res); setLoading(false); })
      .catch(err => { setError(err.message || 'Failed to load candidates.'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm animate-pulse">
        {t('common.loading', 'Loading similarity candidates…')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Feature header */}
      <div className="flex items-start gap-3">
        <Copy size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t('duplicates.title', 'Duplicate Candidate Intelligence')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('duplicates.sub', 'Structural similarity candidates from the authentic production dataset, requiring human review.')}
          </p>
        </div>
      </div>

      {/* Primary disclaimer — always visible */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">{t('duplicates.disclaimer', 'Similarity indicates a review candidate, not a confirmed duplicate or wrongdoing.')}</p>
          <p>{t('common.standing_disclaimer_body', 'Candidate matches are analytical signals intended to support human verification.')}</p>
        </div>
      </div>

      {/* Methodology note */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-semibold text-blue-900">{t('duplicates.common_features', 'Matching Methodology')}</p>
          <p>{data?.methodology_note}</p>
          <p className="italic mt-1">{data?.description_quality_note}</p>
        </div>
      </div>

      {/* Summary count */}
      <div className="flex items-center gap-4">
        <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm text-sm">
          <span className="text-slate-500">{t('duplicates.title', 'Candidate Pairs Found')}: </span>
          <span className="font-bold text-slate-800 text-base">{data?.total_candidate_pairs ?? 0}</span>
        </div>
        {(data?.total_candidate_pairs ?? 0) === 0 && (
          <p className="text-sm text-slate-500 italic">
            {t('duplicates.no_candidates', 'No verified duplicate evidence identified. Candidate matching requires human verification.')}
          </p>
        )}
      </div>

      {/* Candidate pairs list */}
      {(data?.candidate_pairs ?? []).length > 0 && (
        <div className="space-y-3">
          {data.candidate_pairs.map((pair, i) => (
            <CandidatePairCard key={pair.pair_id} pair={pair} index={i} />
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">
        {data?.disclaimer}
      </p>
    </div>
  );
};

export default DuplicateCandidatesPanel;
