import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  BarChart2,
  Settings,
} from 'lucide-react';
import { AnalyticsAPI } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

// ────────────────────────────────────────────────────────────────────────────
// IsolationForestPanel
//
// Displays the precomputed offline Isolation Forest cross-check results.
//
// CLAIM SAFETY — Must display:
//   "Isolation Forest identifies statistically unusual observations within the selected feature space.
//    An outlier is not evidence of fraud or wrongdoing and does not change the Model A risk score."
//   Model A and IF results must remain visually and semantically separate.
// ────────────────────────────────────────────────────────────────────────────

const TIER_COLORS = {
  Critical: 'text-red-700 bg-red-50 border-red-200',
  High: 'text-orange-700 bg-orange-50 border-orange-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-green-700 bg-green-50 border-green-200',
  Unknown: 'text-slate-600 bg-slate-50 border-slate-200',
};

const ModelATierBadge = ({ tier, score }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${TIER_COLORS[tier] || TIER_COLORS.Unknown}`}>
    Model A: {tier} ({score})
  </span>
);

const AnomalyScoreBar = ({ score }) => {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-orange-400' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-8 text-right">{(score).toFixed(2)}</span>
    </div>
  );
};

const OutlierRow = ({ rec, rank }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs font-mono text-slate-400 w-5 text-right flex-shrink-0">{rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {rec.constituency || '—'} · {rec.category}
          </p>
          <p className="text-xs text-slate-500">
            {rec.mp_name} · {rec.state} · {t('common.term', 'Term')} {rec.lok_sabha_term}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-28 hidden sm:block">
            <AnomalyScoreBar score={rec.if_anomaly_score} />
          </div>
          <ModelATierBadge tier={rec.model_a_risk_level} score={rec.model_a_total_score} />
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">{t('common.sanctioned', 'Sanctioned Cost')}</p>
            <p className="font-semibold">₹{rec.sanctioned_cost.toFixed(2)} {t('common.crores', 'Cr')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('common.expenditure', 'Expenditure')}</p>
            <p className="font-semibold">₹{rec.expenditure.toFixed(2)} {t('common.crores', 'Cr')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('map.unspent_balance', 'Unspent Balance')}</p>
            <p className={`font-semibold ${rec.unspent_balance < 0 ? 'text-red-600' : ''}`}>
              ₹{rec.unspent_balance.toFixed(2)} {t('common.crores', 'Cr')}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('common.utilization', 'Utilization Ratio')}</p>
            <p className="font-semibold">{(rec.utilization_ratio * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('if.col_ml_score', 'IF Anomaly Score')}</p>
            <p className="font-mono font-semibold">{rec.if_anomaly_score.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('common.score', 'Percentile Rank')}</p>
            <p className="font-semibold">{rec.if_percentile_rank}th</p>
          </div>
          <div className="col-span-2 sm:col-span-3 pt-1">
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
              {rec.if_label}
            </span>
            <Link
              to={`/projects/${rec.source_record_id}`}
              className="ml-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('common.investigate', 'Investigate')} <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs font-semibold text-slate-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const IsolationForestPanel = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    setLoading(true);
    AnalyticsAPI.getIsolationForest()
      .then(res => { setData(res); setLoading(false); })
      .catch(err => { setError(err.message || 'Failed to load IF results.'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm animate-pulse">
        {t('common.loading', 'Loading Isolation Forest cross-check…')}
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

  if (!data?.available) {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700">{t('if.artifact_not_found', 'Isolation Forest artifact not found')}</p>
        <p className="text-xs text-slate-500">{t('if.run_cmd', 'Run')} <code className="font-mono bg-slate-100 px-1 rounded">python ml/isolation_forest.py</code> {t('if.generate_cross_check', 'to generate the cross-check artifact.')}</p>
      </div>
    );
  }

  const s = data.summary;
  const tierDist = s.model_a_tier_distribution_among_outliers || {};

  return (
    <div className="space-y-5">
      {/* Feature header */}
      <div className="flex items-start gap-3">
        <GitBranch size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t('if.title', 'Isolation Forest Statistical Cross-Check')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('if.sub', 'Offline independent statistical cross-check · NOT Model A')}
          </p>
        </div>
      </div>

      {/* Primary disclaimer */}
      <div className="flex items-start gap-3 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
        <Shield size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-900 space-y-1">
          <p className="font-semibold">
            {t('if.disclaimer', 'Isolation Forest identifies statistically unusual observations within the selected feature space. An outlier is not evidence of fraud or wrongdoing and does not change the Model A risk score.')}
          </p>
          <p className="text-xs text-purple-800">
            {t('if.disclaimer_sub', 'Model A remains the authoritative production risk-prioritization model. The Isolation Forest result is an independent exploratory cross-check.')}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Statistical Outlier Candidates"
          value={s.n_outliers}
          sub={`${s.n_outliers} statistical outlier candidates (${s.outlier_rate_pct}%)`}
        />
        <SummaryCard
          label="Overlap with Model A High Risk"
          value={s.overlap_with_model_a_high}
          sub="Records flagged by both methods"
        />
        <SummaryCard
          label="Model A Low (among outliers)"
          value={tierDist.Low ?? 0}
          sub="IF outliers not in Model A High"
        />
        <SummaryCard
          label="Total Evaluated"
          value={data.total_records_evaluated}
          sub="Authentic production records"
        />
      </div>

      {/* Overlap note */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>{s.overlap_note}</span>
      </div>

      {/* Model A tier distribution among IF outliers */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <BarChart2 size={15} className="text-slate-400" />
          {t('if.title', 'Model A Tier Distribution Among IF Outliers')}
        </p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(tierDist).sort().map(([tier, count]) => (
            <div key={tier} className={`px-3 py-2 rounded-lg border text-center min-w-[80px] ${TIER_COLORS[tier] || TIER_COLORS.Unknown}`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs font-semibold">{tier}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 italic">
          These are the Model A tiers of the {s.n_outliers} statistical outlier candidates.
          Overlap does not validate either method.
        </p>
      </div>

      {/* Model configuration (collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
          onClick={() => setShowConfig(c => !c)}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings size={14} className="text-slate-400" />
            Model Configuration & Features
          </span>
          {showConfig ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        {showConfig && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-3 text-sm text-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                ['Model', 'IsolationForest (sklearn)'],
                ['n_estimators', data.config?.n_estimators],
                ['contamination', data.config?.contamination],
                ['random_state', data.config?.random_state],
                ['Scaler', data.config?.scaler],
                ['max_features', data.config?.max_features],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 rounded p-2">
                  <p className="text-slate-400 font-medium">{k}</p>
                  <p className="font-mono font-semibold text-slate-800">{String(v)}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-500 mb-1">Features Used ({data.config?.features?.length ?? 4})</p>
              <div className="flex flex-wrap gap-1">
                {(data.config?.features || []).map(f => (
                  <span key={f} className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 font-medium">{f}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-500 mb-1">{t('common.disclaimer', 'Feature Dependence Note')}</p>
              <p className="text-xs text-slate-600 italic">{data.config?.feature_dependence_note}</p>
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-500 mb-1">{t('if.contamination', 'Contamination Rationale')}</p>
              <p className="text-xs text-slate-600 italic">{data.config?.contamination_rationale}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top outliers */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Top {data.top_outliers?.length ?? 0} Statistically Unusual Records
          <span className="ml-2 text-xs font-normal text-slate-400">(sorted by anomaly score, highest first)</span>
        </p>
        <div className="space-y-2">
          {(data.top_outliers || []).map((rec, i) => (
            <OutlierRow key={rec.source_record_id} rec={rec} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">
        {data.claim_safety}
      </p>
    </div>
  );
};

export default IsolationForestPanel;
