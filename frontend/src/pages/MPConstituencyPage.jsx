import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Landmark, 
  TrendingUp, 
  ShieldAlert, 
  Search, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  FileText, 
  ExternalLink,
  GitBranch,
  Building,
  MapPin,
  Clock,
  ArrowRight,
  Layers,
  ChevronDown
} from 'lucide-react';
import { AnalyticsAPI, ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import { useRole, ROLES } from '../context/RoleContext';
import { useLanguage } from '../i18n/LanguageContext';

export const MPConstituencyPage = () => {
  const { t } = useLanguage();
  const { selectedConstituency, changeConstituency, constituencyList, PROTOTYPE_CONSTITUENCIES } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConstituencyData = async () => {
      if (!selectedConstituency) return;
      setLoading(true);
      setError(null);
      try {
        const res = await AnalyticsAPI.getConstituencyAnalytics(selectedConstituency);
        setData(res);
      } catch (err) {
        console.error('Failed to load constituency analytics:', err);
        setError(err.message || `No allocation data available for constituency '${selectedConstituency}'.`);
      } finally {
        setLoading(false);
      }
    };

    fetchConstituencyData();
  }, [selectedConstituency]);

  const getRiskBadge = (level, score) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return <span className="gov-badge-critical font-bold text-xs">Critical ({score})</span>;
      case 'high':
        return <span className="gov-badge-high font-bold text-xs">High Risk ({score})</span>;
      case 'medium':
        return <span className="gov-badge-medium font-semibold text-xs">Medium Risk ({score})</span>;
      default:
        return <span className="gov-badge-low text-xs">Low ({score})</span>;
    }
  };

  const getTrajectoryBadge = (status) => {
    switch (status) {
      case 'ESCALATING':
      case 'ELEVATED':
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded border border-red-300">Trajectory: {status}</span>;
      case 'IMPROVING':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded border border-emerald-300">Trajectory: IMPROVING</span>;
      case 'STABLE':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded border border-blue-300">Trajectory: STABLE</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-300">INSUFFICIENT HISTORY</span>;
    }
  };

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto">
      {/* Top Header & Simulated Constituency Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-900 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs font-semibold mb-2">
            <Landmark className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('mp.title', 'MP / Representative Stakeholder Portal')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t('mp.tab_overview', 'My Constituency')}:</span>
            <span className="text-gov-navy">{selectedConstituency}</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Analytical overview of allocations within the selected constituency.
          </p>
        </div>

        {/* Prototype Constituency Dropdown Selector */}
        <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Simulated Constituency:
          </span>
          <select
            aria-label="Select Simulated MP Constituency"
            value={selectedConstituency}
            onChange={(e) => changeConstituency(e.target.value)}
            className="gov-input text-xs font-semibold text-slate-900 py-1.5 px-2 bg-amber-50/50 border-amber-300 focus:ring-amber-500"
          >
            {(constituencyList || PROTOTYPE_CONSTITUENCIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prototype Disclosure Banner */}
      <div className="p-3.5 bg-amber-50/80 rounded-lg border border-amber-200 text-slate-700 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800">Prototype Role Disclosure:</span>
          <p className="text-slate-600">
            Prototype role simulation. Production deployment would require authenticated identity and authorization controls.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingState message={`Aggregating analytical indicators and allocations for ${selectedConstituency}...`} />
        </div>
      ) : error || !data ? (
        <div className="gov-card p-8 text-center space-y-3 border-red-200 max-w-xl mx-auto">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Insufficient Data for Selected Constituency</h2>
          <p className="text-xs text-slate-600">
            {error || `No validated allocation records are currently available for ${selectedConstituency}.`}
          </p>
          <div className="pt-2">
            <button
              onClick={() => changeConstituency('Varanasi')}
              className="gov-btn-primary text-xs"
            >
              Switch to Varanasi (Sample)
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. KPI Cards (Using authentic existing database records) */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-gov-navy" />
                Constituency Portfolio Highlights ({data.state})
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {data.terms_present.map(t => `${t}th LS`).join(', ') || 'Observed Sessions'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Allocations */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('mp.total_allocations', 'Allocations')}</span>
                <span className="text-xl font-black text-slate-900 block">{data.total_allocations}</span>
                <span className="text-[10px] text-slate-400">{t('mp.total_allocations', 'Total works')}</span>
              </div>

              {/* Total Sanctioned */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('common.sanctioned', 'Sanctioned')}</span>
                <span className="text-xl font-black text-slate-900 block">₹{data.total_sanctioned_crore.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">{t('common.sanctioned', 'Approved budget')}</span>
              </div>

              {/* Total Expenditure */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold text-gov-navy uppercase tracking-wider block">{t('common.expenditure', 'Reported Spent')}</span>
                <span className="text-xl font-black text-gov-navy block">₹{data.total_expenditure_crore.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-500">{t('dashboard.reported_expenditure', 'Cumulative incurred')}</span>
              </div>

              {/* Financial Utilization Proxy */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">{t('common.utilization', 'Utilization Proxy')}</span>
                <span className="text-xl font-black text-emerald-700 block">{data.financial_utilization_proxy.toFixed(1)}%</span>
                <span className="text-[10px] text-emerald-600" title="Proxy: expenditure / sanctioned_cost * 100">{t('common.utilization', 'Disbursement proxy')}</span>
              </div>

              {/* Average Risk Score */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('map.avg_risk_score', 'Average Risk')}</span>
                <span className="text-xl font-black text-slate-900 block">{data.avg_model_a_score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span></span>
                <span className="text-[10px] text-slate-400">Model A mean</span>
              </div>

              {/* High-Risk Allocations */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">{t('mp.review_priorities', 'Review Priorities')}</span>
                <span className="text-xl font-black text-amber-700 block">{data.high_risk_count}</span>
                <span className="text-[10px] text-amber-600 font-medium">Score ≥ 50 tier</span>
              </div>
            </div>
          </section>

          {/* 2. Analytical Risk Distribution (Section 7) */}
          <section className="gov-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Analytical Risk Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Distribution of existing Model A analytical review tiers within the selected constituency.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Total evaluated: {data.total_allocations}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-900 block">Low (0–24)</span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">{data.risk_distribution.Low || 0}</span>
                <span className="text-[10px] text-slate-500">
                  {data.total_allocations > 0 ? `${(((data.risk_distribution.Low || 0) / data.total_allocations) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <span className="text-[11px] font-bold text-yellow-900 block">Medium (25–49)</span>
                <span className="text-xl font-black text-yellow-700 mt-1 block">{data.risk_distribution.Medium || 0}</span>
                <span className="text-[10px] text-slate-500">
                  {data.total_allocations > 0 ? `${(((data.risk_distribution.Medium || 0) / data.total_allocations) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300">
                <span className="text-[11px] font-bold text-amber-900 block">High (50–74)</span>
                <span className="text-xl font-black text-amber-700 mt-1 block">{data.risk_distribution.High || 0}</span>
                <span className="text-[10px] text-amber-700 font-medium">
                  {data.total_allocations > 0 ? `${(((data.risk_distribution.High || 0) / data.total_allocations) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <span className="text-[11px] font-bold text-red-900 block">Critical (75–100)</span>
                <span className="text-xl font-black text-red-700 mt-1 block">{data.risk_distribution.Critical || 0}</span>
                <span className="text-[10px] text-slate-400">
                  {data.total_allocations > 0 ? `${(((data.risk_distribution.Critical || 0) / data.total_allocations) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1">
              *Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.
            </p>
          </section>

          {/* 3. Allocations Prioritized for Review (Section 8) */}
          <section className="gov-card p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Allocations Prioritized for Review
                </h3>
                <p className="text-xs text-slate-500">
                  Constituency allocations exhibiting elevated analytical review indicators against peer cohorts
                </p>
              </div>
              <Link
                to={`/projects?search=${encodeURIComponent(data.constituency_name)}`}
                className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1"
              >
                View all allocations →
              </Link>
            </div>

            {data.priority_allocations.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded">
                All allocations in this constituency sit within standard baseline cohort thresholds.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="gov-table text-xs">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Parliamentary Term</th>
                      <th>Civic Category</th>
                      <th className="text-right">{t('common.sanctioned', 'Sanctioned')}</th>
                      <th className="text-right">{t('common.expenditure', 'Reported Spent')}</th>
                      <th className="text-center">Utilization</th>
                      <th className="text-center">Risk Assessment</th>
                      <th className="text-left">Primary Review Signal</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.priority_allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="font-mono font-bold text-gov-navy">{alloc.source_record_id}</td>
                        <td className="text-slate-700">{alloc.lok_sabha_term}th Lok Sabha</td>
                        <td className="text-slate-800 font-medium">{alloc.category}</td>
                        <td className="text-right font-mono">₹{alloc.sanctioned_cost.toFixed(2)} Cr</td>
                        <td className="text-right font-mono font-bold text-slate-900">₹{alloc.expenditure.toFixed(2)} Cr</td>
                        <td className="text-center font-mono">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100">
                            {alloc.financial_utilization_proxy.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center">
                          {getRiskBadge(alloc.risk_level, alloc.total_score)}
                        </td>
                        <td className="text-slate-700 max-w-xs truncate" title={alloc.primary_flag}>
                          {alloc.primary_flag}
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/projects/${alloc.source_record_id}`}
                            className="gov-btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 shadow-sm"
                            title="Inspect allocation analytical breakdown"
                          >
                            View Allocation <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 4. Cross-Term Longitudinal Progression & Trajectory (Sections 10 & 11) */}
          <section className="gov-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gov-navy" />
                  Cross-Term Longitudinal Progression &amp; Risk Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  Longitudinal comparison across 15th, 16th, and 17th Lok Sabha parliamentary sessions for {data.constituency_name}
                </p>
              </div>
              {getTrajectoryBadge(data.trajectory_status)}
            </div>

            {/* Trajectory Note */}
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-gov-navy flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Trajectory Interpretation: </span>
                {data.trajectory_note}
              </div>
            </div>

            {/* Term Breakdown Table */}
            {data.term_breakdown.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded">
                Insufficient data for term comparison.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="gov-table text-xs">
                  <thead>
                    <tr>
                      <th>Lok Sabha Session</th>
                      <th className="text-center">Allocation Count</th>
                      <th className="text-right">Sanctioned Budget</th>
                      <th className="text-right">{t('common.expenditure', 'Reported Spent')}</th>
                      <th className="text-center">{t('common.utilization', 'Utilization Proxy')}</th>
                      <th className="text-center">Average Model A Score</th>
                      <th className="text-center">{t('mp.high_risk_count', 'High-Risk Allocations')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.term_breakdown.map((tb) => (
                      <tr key={tb.term} className="hover:bg-slate-50 transition-colors">
                        <td className="font-bold text-slate-900">{tb.term_label}</td>
                        <td className="text-center font-mono font-medium">{tb.allocations_count}</td>
                        <td className="text-right font-mono text-slate-700">₹{tb.total_sanctioned_crore.toFixed(2)} Cr</td>
                        <td className="text-right font-mono font-bold text-gov-navy">₹{tb.total_expenditure_crore.toFixed(2)} Cr</td>
                        <td className="text-center font-mono">
                          <span className="px-2 py-0.5 rounded font-semibold bg-slate-100">
                            {tb.financial_utilization_proxy.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center font-mono font-bold text-slate-900">
                          {tb.avg_model_a_score.toFixed(1)} / 100
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            tb.high_risk_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tb.high_risk_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 5. Peer Benchmark Comparison (Section 12) */}
          {data.peer_benchmark && (
            <section className="gov-card p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-gov-navy" />
                    Empirical Peer Benchmark Comparison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparative cohort benchmarking against national baseline in {data.peer_benchmark.primary_category}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                  Cohort Context Layer
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-slate-500 block font-medium">Constituency Average Sanctioned:</span>
                  <span className="text-lg font-black text-slate-900 block">₹{data.peer_benchmark.constituency_avg_sanctioned.toFixed(2)} Cr</span>
                  <span className="text-[10px] text-slate-400">National Cohort Median: ₹{data.peer_benchmark.cohort_sanctioned_median.toFixed(2)} Cr</span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-slate-500 block font-medium">Constituency Average Expenditure:</span>
                  <span className="text-lg font-black text-gov-navy block">₹{data.peer_benchmark.constituency_avg_expenditure.toFixed(2)} Cr</span>
                  <span className="text-[10px] text-slate-400">National P90 Threshold: ₹{data.peer_benchmark.cohort_expenditure_p90.toFixed(2)} Cr</span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-slate-500 block font-medium">Constituency Financial Utilization:</span>
                  <span className="text-lg font-black text-emerald-700 block">{data.peer_benchmark.constituency_avg_utilization.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-400">National Cohort Median: {data.peer_benchmark.cohort_avg_utilization.toFixed(1)}%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded text-[11px] text-slate-600 leading-relaxed border border-slate-200">
                <p>{data.peer_benchmark.comparison_note}</p>
              </div>
            </section>
          )}

          {/* 6. Quick Navigation to Scoped Explorer & Dossier */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={`/projects?search=${encodeURIComponent(data.constituency_name)}`}
              className="gov-card p-5 hover:shadow-md transition-shadow flex items-center justify-between group border-l-4 border-l-gov-navy"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-gov-navy">
                  Explore All Allocations in {data.constituency_name}
                </h4>
                <p className="text-xs text-slate-500">
                  Filter by status, parliamentary term, and civic category
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gov-navy group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/methodology"
              className="gov-card p-5 hover:shadow-md transition-shadow flex items-center justify-between group border-l-4 border-l-emerald-600"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                  Inspect Scoring Methodology &amp; Cohorts
                </h4>
                <p className="text-xs text-slate-500">
                  Review mathematical formulas, percentiles (Median, P90), and governance rules
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          </section>

          {/* Responsible AI Standing Disclaimer */}
          <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Responsible AI &amp; Analytical Governance Statement:</p>
            <p className="leading-relaxed">
              {data.disclaimer || "Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing."}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MPConstituencyPage;
