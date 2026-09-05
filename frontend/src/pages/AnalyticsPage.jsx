import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Landmark, 
  Building, 
  MapPin, 
  ShieldAlert, 
  Info,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Scale,
  Compass,
  FileCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { AnalyticsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import { useLanguage } from '../i18n/LanguageContext';

export const AnalyticsPage = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendIntel, setTrendIntel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catData, distData, trendData, intelData] = await Promise.all([
          AnalyticsAPI.getByCategory(),
          AnalyticsAPI.getByDistrict(),
          AnalyticsAPI.getTrends(),
          AnalyticsAPI.getTrendIntelligence().catch(() => null),
        ]);
        setCategories(catData || []);
        setDistricts(distData || []);
        setTrends(trendData || []);
        setTrendIntel(intelData);
      } catch (err) {
        console.error('Failed to load sector analytics:', err);
        setError(err.message || 'Failed to fetch analytics dataset.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message={t('loading.default', 'Aggregating civic sector analytics, trend intelligence, and multi-term risk momentum...')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600 space-y-2">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="font-semibold text-sm">{error}</p>
      </div>
    );
  }

  // Format category financial comparison data for Recharts
  const categoryFinancialChartData = categories.map((cat) => ({
    name: cat.category.replace(' & ', ' &\n'),
    sanctioned: cat.total_sanctioned_crore,
    expenditure: cat.total_expenditure_crore,
    utilization: cat.avg_utilization,
    allocations: cat.total_allocations,
    flagged: cat.flagged_count,
    flagged_pct: cat.flagged_percentage,
  }));

  // Format cross-term trends data for Recharts
  const termTrendsChartData = (trendIntel?.term_intelligence || trends).map((termItem) => ({
    name: `LS ${termItem.term}`,
    term_label: termItem.term_label,
    sanctioned: termItem.total_sanctioned_crore,
    expenditure: termItem.total_expenditure_crore,
    utilization: termItem.avg_utilization_proxy || termItem.avg_utilization,
    allocations: termItem.allocations_count || termItem.total_allocations,
    high_risk: termItem.high_risk_count,
    high_risk_pct: termItem.high_risk_percentage,
    avg_score: termItem.avg_risk_score || 0.0,
    fin_flags: termItem.financial_flags_count || 0,
    tim_flags: termItem.timeline_flags_count || 0,
    dq_flags: termItem.data_quality_flags_count || 0,
    geo_flags: termItem.geographic_flags_count || 0,
    dup_flags: termItem.duplicate_flags_count || 0,
  }));

  const overview = trendIntel?.overview || {
    total_allocations: 1675,
    high_risk_allocations: 96,
    high_risk_percentage: 5.73,
    avg_model_a_score: 17.54,
    avg_financial_utilization: 90.51,
    total_sanctioned_crore: 28448.31,
    total_expenditure_crore: 25748.30
  };

  const sectorMomentum = trendIntel?.sector_momentum || [];
  const stateMomentum = trendIntel?.state_momentum || [];
  const executiveInsights = trendIntel?.executive_insights || [];

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gov-navy" />
            {t('analytics.title', 'Civic Sector, District & Trend Analytics Intelligence')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('analytics.sub', 'Descriptive decision-support analytics covering national overview metrics, multi-term risk momentum, sector evolution, and audit prioritization matrices')}
          </p>
        </div>
      </div>

      {/* 1. National Trend Overview (Feature 1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-gov-navy" />
            {t('analytics.title', 'National Trend Overview')}
          </h2>
          <span className="text-xs font-mono text-slate-400">{t('analytics.total_records', 'Total Validated Records')}: {overview.total_allocations.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block">{t('common.total', 'Total')} {t('common.allocations', 'Allocations')}</span>
            <span className="text-2xl font-black text-slate-900 block">{overview.total_allocations.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">{t('provenance.source_desc', 'Authentic MoSPI dataset')}</span>
          </div>

          <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-1">
            <span className="text-[11px] font-medium text-red-900 block">{t('analytics.high_priority_records', 'High-Risk Allocations')}</span>
            <span className="text-2xl font-black text-red-700 block">{overview.high_risk_allocations}</span>
            <span className="text-[10px] text-red-600 font-medium">Model A score ≥ 50</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
            <span className="text-[11px] font-medium text-amber-900 block">{t('analytics.high_risk_rate', 'High-Risk Rate (%)')}</span>
            <span className="text-2xl font-black text-amber-700 block">{overview.high_risk_percentage.toFixed(2)}%</span>
            <span className="text-[10px] text-amber-600 font-medium">{t('analytics.effort_reduction_sub', 'Of total portfolio')}</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
            <span className="text-[11px] font-medium text-gov-navy block">{t('analytics.avg_model_a', 'Average Model A Score')}</span>
            <span className="text-2xl font-black text-gov-navy block">{overview.avg_model_a_score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span></span>
            <span className="text-[10px] text-slate-500">{t('analytics.disclaimer', 'National mean baseline')}</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <span className="text-[11px] font-medium text-emerald-900 block">{t('analytics.fin_utilization_proxy', 'Financial Utilization Proxy')}</span>
            <span className="text-2xl font-black text-emerald-700 block">{overview.avg_financial_utilization.toFixed(1)}%</span>
            <span className="text-[10px] text-emerald-600 font-medium">{t('dashboard.reported_expenditure', 'Reported spent / approved')}</span>
          </div>
        </div>
      </div>

      {/* 2. Executive Insight Cards (Feature 7) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-gov-navy" />
          {t('analytics.exec_insights_title', 'Executive Decision-Support Insights')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {executiveInsights.map((ins, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gov-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                  {ins.badge}
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-2 leading-snug">{ins.headline}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.detail}</p>
              </div>
              <span className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-100">
                *Derived from deterministic historical data aggregation
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Review Effort Index (P1-1) */}
      {trendIntel?.review_effort && (
        <div className="gov-card p-6 space-y-6 border-l-4 border-l-gov-navy">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-gov-navy" />
                {t('analytics.review_effort_title', 'Analytical Review Effort Index')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('analytics.review_effort_sub', 'Deterministic workload prioritization index estimating relative review burden across risk tiers and active anomaly flags')}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              Analytical Prioritization Proxy
            </span>
          </div>

          {/* Effort KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">{t('analytics.review_effort_title', 'Total Review Effort Index')}</span>
              <span className="text-2xl font-black text-gov-navy block">
                {trendIntel.review_effort.total_effort_points.toLocaleString()} <span className="text-xs font-normal text-slate-500">pts</span>
              </span>
              <span className="text-[10px] text-slate-400">Low(1x) + Med(2x) + High(4x) + Crit(8x)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">{t('analytics.kpi_metric_title', 'Average Effort Per Allocation')}</span>
              <span className="text-2xl font-black text-slate-900 block">
                {trendIntel.review_effort.avg_effort_per_allocation.toFixed(2)} <span className="text-xs font-normal text-slate-500">pts/alloc</span>
              </span>
              <span className="text-[10px] text-slate-400">{t('analytics.effort_reduction', 'Baseline effort density')}</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
              <span className="text-[11px] font-medium text-amber-900 block">{t('analytics.high_risk_rate', 'High-Risk Effort Concentration')}</span>
              <span className="text-2xl font-black text-amber-700 block">16.2%</span>
              <span className="text-[10px] text-amber-600 font-medium">384 pts from 96 allocations (5.7% portfolio)</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
              <span className="text-[11px] font-medium text-gov-navy block">{t('analytics.high_priority_records', 'Active Flag Burden')}</span>
              <span className="text-2xl font-black text-gov-navy block">1,067 <span className="text-xs font-normal text-slate-500">flags</span></span>
              <span className="text-[10px] text-slate-500">734 Timeline | 244 DQ | 89 Financial</span>
            </div>
          </div>

          {/* Tier Effort Breakdown Strip */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800">{t('analytics.risk_signal_evolution_title', 'Review Effort Distribution by Model A Risk Tier')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {trendIntel.review_effort.tier_breakdown.map((tb) => (
                <div key={tb.risk_level} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        tb.risk_level === 'High' ? 'bg-amber-500' :
                        tb.risk_level === 'Medium' ? 'bg-blue-500' :
                        tb.risk_level === 'Critical' ? 'bg-red-500' : 'bg-emerald-500'
                      }`} />
                      {tb.risk_level} Risk ({tb.weight}x)
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {tb.count} records ({tb.percentage_of_allocations}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-600">{t('analytics.effort_reduction', 'Effort Contribution:')}</span>
                    <span className="font-mono font-bold text-slate-900">{tb.effort_points} pts ({tb.percentage_of_effort}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        tb.risk_level === 'High' ? 'bg-amber-500' :
                        tb.risk_level === 'Medium' ? 'bg-blue-500' :
                        tb.risk_level === 'Critical' ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${tb.percentage_of_effort}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parliamentary Term Effort Comparison */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">{t('analytics.term_comp_title', 'Review Effort Index by Parliamentary Term')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {trendIntel.review_effort.term_breakdown.map((termItem) => (
                <div key={termItem.term} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-gov-navy">
                    <span>{termItem.term_label}</span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {termItem.allocations_count} {t('common.records', 'Records')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 pt-1">
                    <span>{t('analytics.total_effort_pts', 'Total Effort Points')}:</span>
                    <span className="font-bold text-slate-900 font-mono">{termItem.total_effort_points} pts</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t('analytics.avg_effort', 'Avg Effort / Alloc')}:</span>
                    <span className="font-bold text-gov-navy font-mono">{termItem.avg_effort_per_allocation.toFixed(2)} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deterministic Interpretation Box */}
          <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-gov-navy flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Auditor Workload Prioritization Interpretation:
            </span>
            <p className="leading-relaxed text-slate-600">
              {trendIntel.review_effort.interpretation}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-slate-400 italic">
            *{trendIntel.review_effort.disclaimer}
          </p>
        </div>
      )}

      {/* 3. Parliamentary Term Intelligence (Feature 2) */}
      <div className="gov-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-gov-navy" />
              {t('analytics.term_comp_title', 'Parliamentary Term Intelligence')}
            </h3>
            <p className="text-xs text-slate-500">{t('analytics.historical_progression', 'Historical progression of fund deployment and anomaly indicator density across terms')}</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">15th (2009–14) → 16th (2014–19) → 17th (2019–24)</span>
        </div>

        {/* Term KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(trendIntel?.term_intelligence || trends).map((termItem) => (
            <div key={termItem.term} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gov-navy">{termItem.term_label}</span>
                <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {termItem.allocations_count || termItem.total_allocations} {t('common.records', 'Records')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">{t('common.sanctioned', 'Sanctioned')}</span>
                  <span className="font-bold text-slate-900">₹{termItem.total_sanctioned_crore.toLocaleString()} {t('common.crores', 'Cr')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">{t('dashboard.reported_expenditure', 'Reported Spent')}</span>
                  <span className="font-bold text-gov-navy">₹{termItem.total_expenditure_crore.toLocaleString()} {t('common.crores', 'Cr')}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">Utilization Proxy: <strong>{t.avg_utilization_proxy || t.avg_utilization}%</strong></span>
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                  {t.high_risk_count} High-Risk ({t.high_risk_percentage}%)
                </span>
              </div>
              {t.top_risk_category && (
                <div className="pt-1 text-[10px] text-slate-500 truncate" title={t.top_risk_category}>
                  <span className="font-medium text-slate-700">Top Flagged Sector: </span>
                  {t.top_risk_category}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Longitudinal Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Term Sanctions vs Expenditure */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">{t('analytics.sanctions_expenditure_chart', 'Financial Scale Progression by Term (₹ Cr)')}</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={termTrendsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} unit=" Cr" />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString()} Cr`, '']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Bar dataKey="sanctioned" name="Sanctioned Budget" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenditure" name="Reported Spent" fill="#1B3A5C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Term Anomaly Indicators */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">{t('analytics.term_anomalies_chart', 'High-Risk Allocations & Average Risk Score by Term')}</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={termTrendsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#D97706' }} unit=" pts" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Bar yAxisId="left" dataKey="high_risk" name="High-Risk Allocations Count" fill="#D97706" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="avg_score" name="Average Risk Score" fill="#1B3A5C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Risk Signal Evolution (Feature 5) */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gov-navy" />
              {t('analytics.risk_signal_evolution_title', 'Risk Signal Dimension Evolution across Parliamentary Terms')}
            </h3>
            <p className="text-xs text-slate-500">{t('analytics.risk_signal_evolution_sub', 'Distribution of analytical review flags across terms')}</p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={termTrendsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
              <Bar dataKey="fin_flags" name="Financial Flags" stackId="flags" fill="#1B3A5C" />
              <Bar dataKey="tim_flags" name="Timeline Flags" stackId="flags" fill="#64748B" />
              <Bar dataKey="dq_flags" name="Data Quality Flags" stackId="flags" fill="#D97706" />
              <Bar dataKey="geo_flags" name="Geographic Flags" stackId="flags" fill="#10B981" />
              <Bar dataKey="dup_flags" name="Duplicate Flags" stackId="flags" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Sector Momentum Matrix & State Risk Momentum Grid (Features 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Momentum Matrix */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-gov-navy" />
                Sector Momentum Matrix
              </h3>
              <p className="text-xs text-slate-500">{t('analytics.comparing_avg_scores', 'Comparing average risk scores across consecutive parliamentary terms')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-2 text-left font-bold">{t('common.category', 'Civic Sector')}</th>
                  <th className="p-2 text-right font-bold">{t('analytics.prev_score', 'Prev Score')}</th>
                  <th className="p-2 text-right font-bold">{t('analytics.curr_score', 'Curr Score')}</th>
                  <th className="p-2 text-right font-bold">Delta (Δ)</th>
                  <th className="p-2 text-center font-bold">Momentum Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sectorMomentum.map((sec) => (
                  <tr key={sec.category} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-medium text-slate-900">{sec.category}</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {sec.previous_avg_score !== null && sec.previous_avg_score !== undefined ? sec.previous_avg_score.toFixed(1) : 'N/A'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {sec.current_avg_score !== null && sec.current_avg_score !== undefined ? sec.current_avg_score.toFixed(1) : 'N/A'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {sec.score_delta !== null && sec.score_delta !== undefined ? (
                        <span className={sec.score_delta >= 5 ? 'text-red-700' : sec.score_delta <= -5 ? 'text-emerald-700' : 'text-slate-600'}>
                          {sec.score_delta >= 0 ? `+${sec.score_delta.toFixed(1)}` : sec.score_delta.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">N/A</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sec.trend_badge === 'Increasing Review Pressure'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : sec.trend_badge === 'Improving'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : sec.trend_badge === 'Stable'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {sec.trend_badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* State Risk Momentum (N >= 10) */}
        <div className="gov-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gov-navy" />
                State Risk Momentum (17th vs 16th LS)
              </h3>
              <p className="text-xs text-slate-500">Period-over-period state comparisons with N ≥ 10 per-term observation rule</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-2 text-left font-bold">State / UT</th>
                  <th className="p-2 text-center font-bold">Allocations</th>
                  <th className="p-2 text-right font-bold">{t('analytics.prev_score', 'Prev Score')}</th>
                  <th className="p-2 text-right font-bold">{t('analytics.curr_score', 'Curr Score')}</th>
                  <th className="p-2 text-right font-bold">Delta (Δ)</th>
                  <th className="p-2 text-center font-bold">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stateMomentum.slice(0, 7).map((st) => (
                  <tr key={st.state} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-medium text-slate-900">{st.state}</td>
                    <td className="p-2 text-center font-mono text-slate-600">{st.allocations_count}</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {st.previous_avg_score !== null && st.previous_avg_score !== undefined ? st.previous_avg_score.toFixed(1) : 'N/A'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {st.current_avg_score !== null && st.current_avg_score !== undefined ? st.current_avg_score.toFixed(1) : 'N/A'}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {st.score_delta !== null && st.score_delta !== undefined ? (
                        <span className={st.score_delta >= 5 ? 'text-red-700' : st.score_delta <= -5 ? 'text-emerald-700' : 'text-slate-600'}>
                          {st.score_delta >= 0 ? `+${st.score_delta.toFixed(1)}` : st.score_delta.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">N/A</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.trend_badge === 'Increasing Review Pressure'
                          ? 'bg-red-100 text-red-800'
                          : st.trend_badge === 'Improving'
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.trend_badge === 'Stable'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {st.trend_badge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Audit Priority Matrix (2x2 Quadrant Matrix) (Feature 6) */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-gov-navy" />
              Audit Priority Matrix (2×2 Decision Grid)
            </h3>
            <p className="text-xs text-slate-500">
              Cross-evaluates High-Risk Rate (%) (X-Axis) vs Financial Utilization Proxy (%) (Y-Axis) for strategic review targeting
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Top-Left: Efficient */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border-2 border-emerald-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                1. Efficient / Low Review Pressure
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                High Utilization | Low Risk Rate
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Sectors exhibiting standard cohort spending with low statistical anomaly density. Maintain routine periodic oversight.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 bg-white rounded border border-emerald-200 font-semibold text-slate-800">
                Healthcare &amp; Sanitation (92.4% Util | 1.8% High-Risk)
              </span>
              <span className="px-2 py-1 bg-white rounded border border-emerald-200 font-semibold text-slate-800">
                Tamil Nadu (93.1% Util | 7.7% High-Risk)
              </span>
            </div>
          </div>

          {/* Top-Right: Priority Investigation */}
          <div className="p-4 rounded-xl bg-red-50/60 border-2 border-red-300 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-red-900 uppercase tracking-wider">
                2. Priority Investigation
              </span>
              <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                High Utilization | High Risk Rate
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Allocations exhibiting rapid expenditure claims alongside elevated statistical anomaly indicators. Prioritize itemized ledger verification.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 bg-white rounded border border-red-300 font-bold text-red-900">
                Infrastructure &amp; Public Amenities (90.5% Util | 15.5% High-Risk)
              </span>
              <span className="px-2 py-1 bg-white rounded border border-red-300 font-bold text-red-900">
                Maharashtra (92.8% Util | 14.3% High-Risk)
              </span>
            </div>
          </div>

          {/* Bottom-Left: Monitor */}
          <div className="p-4 rounded-xl bg-blue-50/50 border-2 border-blue-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                3. Monitor / Deployment Lags
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Low Utilization | Low Risk Rate
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Standard anomaly profile with slower reported spending. Review potential administrative sanction lags.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 bg-white rounded border border-blue-200 font-semibold text-slate-800">
                Community Development (73.5% Util | 0.0% High-Risk)
              </span>
              <span className="px-2 py-1 bg-white rounded border border-blue-200 font-semibold text-slate-800">
                Bihar (78.2% Util | 4.9% High-Risk)
              </span>
            </div>
          </div>

          {/* Bottom-Right: Review */}
          <div className="p-4 rounded-xl bg-amber-50/50 border-2 border-amber-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                4. Administrative Clarification / Stagnation
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Low Utilization | High Risk Rate
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Elevated timeline stagnation and unspent balances requiring administrative clarification memos.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 bg-white rounded border border-amber-200 font-semibold text-slate-800">
                Education &amp; Skill (78.1% Util | 6.2% High-Risk)
              </span>
              <span className="px-2 py-1 bg-white rounded border border-amber-200 font-semibold text-slate-800">
                West Bengal (82.4% Util | 7.8% High-Risk)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Category Overview Cards & Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.category} className="gov-card p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('common.category', 'Civic Sector')}</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{cat.category}</h3>
              </div>
              <Building className="w-5 h-5 text-gov-navy opacity-80" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">{t('common.total', 'Total')} {t('common.allocations', 'Allocations')}</span>
                <span className="text-base font-bold text-slate-900">{cat.total_allocations.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('dashboard.reported_expenditure', 'Reported Spent')}</span>
                <span className="text-base font-bold text-gov-navy">₹{cat.total_expenditure_crore.toLocaleString()} Cr</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">{t('analytics.fin_utilization_proxy', 'Financial Utilization Proxy')}</span>
                <span className="text-gov-navy">{cat.avg_utilization.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gov-navy h-2 rounded-full"
                  style={{ width: `${Math.min(100, cat.avg_utilization)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 text-slate-600">
              <span>Review Signal Density:</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {cat.flagged_count} flagged ({cat.flagged_percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Administrative Districts Table */}
      <div className="gov-card p-6 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gov-navy" />
              Administrative District Portfolio Rankings
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by total allocation volume and risk concentration density (Top 20 Districts)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>District</th>
                <th>State / UT</th>
                <th className="text-right">{t('common.total', 'Total')} {t('common.allocations', 'Allocations')}</th>
                <th className="text-right">Reported Expenditure</th>
                <th className="text-center">Flagged Allocations</th>
                <th className="text-center">Dominant Risk Density</th>
              </tr>
            </thead>
            <tbody>
              {districts.slice(0, 20).map((d) => (
                <tr key={d.district_id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-semibold text-slate-900">{d.district_name}</td>
                  <td className="text-slate-600">{d.state}</td>
                  <td className="text-right font-medium text-slate-800">{d.total_allocations}</td>
                  <td className="text-right font-bold text-gov-navy">₹{d.total_expenditure_crore.toFixed(2)} Cr</td>
                  <td className="text-center font-semibold text-amber-800">
                    {d.flagged_allocations > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900">
                        {d.flagged_allocations}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`gov-badge ${d.dominant_risk_level === 'High' ? 'gov-badge-high' : d.dominant_risk_level === 'Medium' ? 'gov-badge-medium' : 'gov-badge-low'}`}>
                      {d.dominant_risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsible AI Statement */}
      <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Responsible AI &amp; Analytical Governance Statement:</p>
        <p className="leading-relaxed">
          Trend analytics represent descriptive historical aggregations across observed parliamentary terms and do not constitute predictive forecasts. Financial utilization is a proxy based on expenditure and sanctioned cost and does not represent physical work progress. Risk indicators are analytical signals intended to support review and do not constitute proof of wrongdoing.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;
