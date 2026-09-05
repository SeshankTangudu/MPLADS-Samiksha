import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  MapPin, 
  FileText, 
  ArrowRight,
  Landmark,
  Scale,
  Users
} from 'lucide-react';
import { AnalyticsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import SelfTestModal from '../components/common/SelfTestModal';
import DataProvenanceCard from '../components/common/DataProvenanceCard';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole, ROLES } from '../context/RoleContext';
import MPConstituencyPage from './MPConstituencyPage';

export const OverviewPage = () => {
  const { t } = useLanguage();
  const { viewRole, isCitizen, isMP, isAuthority } = useRole();

  if (isMP) {
    return <MPConstituencyPage />;
  }

  const [loading, setLoading] = useState(false);
  const [selfTestOpen, setSelfTestOpen] = useState(false);
  // Live stats state
  const [stats, setStats] = useState({
    total_allocations: 1675,
    total_mps: 1547,
    total_districts: 1015,
    total_sanctioned_crore: 24823.50,
    total_expenditure_crore: 21624.25,
    total_unspent_crore: 3199.25,
    overall_utilization_rate: 87.11,
    risk_distribution: {
      low: 1166,
      medium: 413,
      high: 96,
      critical: 0
    },
    flagged_rate_percentage: 5.73,
    terms_covered: [15, 16, 17]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await AnalyticsAPI.getOverviewStats();
        if (data) setStats(data);
      } catch (err) {
        console.error('Failed to load live overview stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10 py-6">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gov-navy to-gov-navyLight text-white rounded-xl p-8 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="max-w-5xl relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium text-slate-100 backdrop-blur-sm border border-white/20">
            <Landmark className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('overview.hero_badge', 'Parliamentary Fund Intelligence Platform (15th, 16th & 17th Lok Sabha)')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t('overview.hero_title', 'Transparent Oversight & Anomaly Intelligence for MPLADS')}
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
            {t('overview.hero_desc', 'Analytical review system examining 1,675 constituency-level work and fund allocations across 2009–2024 using multi-signal statistical cohort baselines and explainable reason decomposition.')}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {isAuthority ? (
              <Link to="/anomalies" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('overview.btn_prioritized_queue', 'Prioritized Review Queue')} ({stats.risk_distribution.high} {t('common.high_risk', 'High-Risk')})</span>
              </Link>
            ) : isMP ? (
              <Link to="/projects" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                <Landmark className="w-4 h-4 flex-shrink-0" />
                <span>{t('mp.tab_allocations', 'Constituency Allocations')}</span>
              </Link>
            ) : (
              <Link to="/projects" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                <Search className="w-4 h-4 flex-shrink-0" />
                <span>{t('overview.btn_explore_allocations', 'Explore 1,675 Allocations')}</span>
              </Link>
            )}

            {isCitizen ? (
              <>
                <Link to="/reports/new" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>{t('overview.btn_report_discrepancy', 'Report a Discrepancy')}</span>
                </Link>
                <Link to="/reports/track" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span>{t('overview.btn_track_report', 'Track Your Report')}</span>
                </Link>
                <Link to="/map" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{t('overview.btn_district_map', 'District Centroid Map')}</span>
                </Link>
              </>
            ) : isMP ? (
              <Link to="/analytics" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span>{t('mp.tab_trajectory', 'Risk & Trajectory Analytics')}</span>
              </Link>
            ) : (
              <Link to="/projects" className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap">
                <Search className="w-4 h-4 flex-shrink-0" />
                <span>{t('overview.btn_explore_allocations', 'Explore 1,675 Allocations')}</span>
              </Link>
            )}

            <button
              onClick={() => setSelfTestOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-gov-navy select-none whitespace-nowrap"
            >
              <Scale className="w-4 h-4 flex-shrink-0" />
              <span>{t('overview.btn_selftest_mode', 'Engine Self-Test Mode')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Citizen Public Governance Journey Guide (Citizen view only) */}
      {isCitizen && (
        <section className="gov-card p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-gov-navy to-slate-900 text-white shadow-md border-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                {t('overview.pathway_tag', 'Citizen Public Oversight Pathway')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {t('overview.pathway_title', 'How Citizens Participate in MPLADS Review')}
              </h2>
            </div>
            <Link
              to="/reports/new"
              className="gov-btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 border-none self-start sm:self-auto flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {t('overview.submit_observation', 'Submit Observation')}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center border border-blue-400/30">
                1
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{t('overview.step1_title', 'Explore Allocations')}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('overview.step1_desc', 'Browse 1,675 authentic parliamentary records across 543 constituencies.')}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center border border-emerald-400/30">
                2
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{t('overview.step2_title', 'Understand Financials')}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('overview.step2_desc', 'Review sanctioned costs, reported expenditures, and financial utilization proxies.')}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center border border-amber-400/30">
                3
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{t('overview.step3_title', 'Review Indicators')}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('overview.step3_desc', 'Inspect explainable statistical flags signaling anomalies requiring review.')}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center border border-indigo-400/30">
                4
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{t('overview.step4_title', 'Report Discrepancy')}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('overview.step4_desc', 'Submit specific on-ground observations to help authorities initiate review.')}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-400/30">
                5
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{t('overview.step5_title', 'Track Resolution')}</h3>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {t('overview.step5_desc', 'Follow real-time status updates using your permanent public Report ID.')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Data Provenance & Scope Display */}
      <DataProvenanceCard />

      {/* Review-Effort Prioritization KPI Banner (Phase 1.1) */}
      <section className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('overview.prioritization_tag', 'Modeled Review-Effort Prioritization')}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            {stats.total_allocations.toLocaleString()} {t('common.allocations', 'Allocations')} → {stats.risk_distribution.high} {t('overview.prioritization_high_priority', 'High-Risk Priorities')}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t('overview.prioritization_desc_prefix', 'Model A prioritizes')} {stats.risk_distribution.high} {t('overview.prioritization_desc_suffix', 'records for high-priority review under current empirical thresholds. 94.27% of records fall outside the High-Risk review queue.')}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto bg-slate-800/80 p-4 rounded-lg border border-slate-700">
          <div className="text-center px-3 border-r border-slate-700">
            <span className="text-2xl font-black text-amber-400 font-mono">{stats.risk_distribution.high}</span>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('overview.high_risk_queue', 'High Risk Queue')}</span>
          </div>
          <div className="text-center px-3 border-r border-slate-700">
            <span className="text-2xl font-black text-slate-200 font-mono">{(stats.risk_distribution.high / (stats.total_allocations || 1) * 100).toFixed(2)}%</span>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('overview.flagged_ratio', 'Flagged Ratio')}</span>
          </div>
          <div className="text-center px-3">
            <span className="text-2xl font-black text-emerald-400 font-mono">{(100 - (stats.risk_distribution.high / (stats.total_allocations || 1) * 100)).toFixed(2)}%</span>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">{t('overview.standard_review', 'Standard Review')}</span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gov-navy" />
            {t('overview.kpi_highlights_title', 'Portfolio Performance Highlights')}
          </h2>
          <span className="text-xs text-slate-500">{t('overview.kpi_highlights_sub', '15th, 16th & 17th Lok Sabha Terms (2009–2024)')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gov-card p-5 border-l-4 border-l-gov-navy">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('overview.kpi_alloc_title', 'Constituency Allocations')}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_allocations.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{t('overview.across_mps_prefix', 'Across')} 1,547 {t('overview.mps_label', 'MPs')} & 1,015 {t('common.district', 'Districts')}</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-blue-600">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('overview.kpi_budget_title', 'Sanctioned Works Budget')}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{stats.total_sanctioned_crore.toLocaleString()} {t('common.crores', 'Cr')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('overview.reported_spent_label', 'Reported Spent')}: ₹{stats.total_expenditure_crore.toLocaleString()} {t('common.crores', 'Cr')}</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-emerald-600">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('overview.kpi_util_title', 'Financial Utilization')}</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.overall_utilization_rate}%</p>
            <p className="text-xs text-slate-500 mt-1">{t('overview.unspent_balance_label', 'Unspent Balance')}: ₹{stats.total_unspent_crore.toLocaleString()} {t('common.crores', 'Cr')}</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('overview.kpi_flagged_title', 'Review Flagged Rate')}</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.flagged_rate_percentage}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.risk_distribution.high + stats.risk_distribution.critical} {t('overview.allocations_in_high_tier', 'Allocations in High/Critical Tier')}</p>
          </div>
        </div>
      </section>

      {/* Feature Navigation Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-gov-navy">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{t('overview.card_explorer_title', 'Allocation Explorer')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('overview.card_explorer_desc', 'Filter by MP name, parliamentary term, civic category, state, and status. Inspect detailed financial breakdown and audit remarks.')}
            </p>
          </div>
          <Link to="/projects" className="inline-flex items-center text-xs font-semibold text-gov-navy hover:text-gov-navyLight mt-4">
            {t('overview.card_explorer_link', 'Explore dataset')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {isAuthority ? (
          <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-t-4 border-t-amber-500">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('overview.card_anomalies_title', 'Anomaly Review Queue')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('overview.card_anomalies_desc', 'Prioritized queue of allocations with elevated risk signals across financial deviation (P90), stagnation, and administrative compliance.')}
              </p>
            </div>
            <Link to="/anomalies" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 mt-4">
              {t('overview.card_anomalies_link', 'Review flagged allocations')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        ) : isMP ? (
          <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-t-4 border-t-amber-500">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('overview.card_trajectory_title', 'Risk & Trajectory Analytics')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('overview.card_trajectory_desc', 'Examine cross-term financial utilization trends, peer cohort benchmarks, and longitudinal constituency performance.')}
              </p>
            </div>
            <Link to="/analytics" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 mt-4">
              {t('overview.card_trajectory_link', 'View trajectory analytics')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        ) : (
          <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-t-4 border-t-blue-600">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('overview.card_map_title', 'GIS Centroid Map')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('overview.card_map_desc', 'Interactive spatial visualization of parliamentary constituency allocations mapped across 1,015 authentic district centroids.')}
              </p>
            </div>
            <Link to="/map" className="inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800 mt-4">
              {t('overview.card_map_link', 'Open spatial map')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        )}

        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{t('overview.card_methodology_title', 'Scoring Methodology')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('overview.card_methodology_desc', 'Transparent mathematical formulas, non-parametric percentiles (Median, P90), and ethical explainability safeguards.')}
            </p>
          </div>
          <Link to="/methodology" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 mt-4">
            {t('overview.card_methodology_link', 'View methodology')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </section>

      {/* Engine Self-Test Modal (Phase 1.2) */}
      <SelfTestModal isOpen={selfTestOpen} onClose={() => setSelfTestOpen(false)} />
    </div>
  );
};

export default OverviewPage;
