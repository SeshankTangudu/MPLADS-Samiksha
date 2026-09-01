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
  Scale
} from 'lucide-react';
import { AnalyticsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const OverviewPage = () => {
  const [loading, setLoading] = useState(false);
  // Default values conforming to frozen API contract
  const [stats, setStats] = useState({
    total_allocations: 1675,
    total_mps: 1547,
    total_districts: 1015,
    total_sanctioned_crore: 24823.50,
    total_expenditure_crore: 21624.25,
    total_unspent_crore: 3199.25,
    overall_utilization_rate: 87.11,
    risk_distribution: {
      low: 1220,
      medium: 380,
      high: 65,
      critical: 10
    },
    flagged_rate_percentage: 4.48,
    terms_covered: [15, 16, 17]
  });

  return (
    <div className="space-y-10 py-6">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gov-navy to-gov-navyLight text-white rounded-xl p-8 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium text-slate-100 backdrop-blur-sm border border-white/20">
            <Landmark className="w-3.5 h-3.5 text-amber-300" />
            <span>Parliamentary Fund Intelligence Platform (15th, 16th & 17th Lok Sabha)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Transparent Oversight & Anomaly Intelligence for MPLADS
          </h1>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            Analytical review system examining 1,675 constituency-level work and fund allocations 
            across 2009–2024 using multi-signal statistical cohort baselines and explainable reason decomposition.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/anomalies" className="gov-btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none shadow-md">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Prioritized Review Queue
            </Link>
            <Link to="/projects" className="gov-btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Search className="w-4 h-4 mr-2" />
              Explore 1,675 Allocations
            </Link>
            <Link to="/map" className="gov-btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <MapPin className="w-4 h-4 mr-2" />
              District Risk Map
            </Link>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gov-navy" />
            Portfolio Performance Highlights
          </h2>
          <span className="text-xs text-slate-500">15th, 16th & 17th Lok Sabha Terms (2009–2024)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gov-card p-5 border-l-4 border-l-gov-navy">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Constituency Allocations</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_allocations.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Across 1,547 MPs & 1,015 Districts</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-blue-600">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sanctioned Works Budget</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{stats.total_sanctioned_crore.toLocaleString()} Cr</p>
            <p className="text-xs text-slate-500 mt-1">Reported Spent: ₹{stats.total_expenditure_crore.toLocaleString()} Cr</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-emerald-600">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Utilization</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.overall_utilization_rate}%</p>
            <p className="text-xs text-slate-500 mt-1">Unspent Balance: ₹{stats.total_unspent_crore.toLocaleString()} Cr</p>
          </div>

          <div className="gov-card p-5 border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Flagged Rate</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.flagged_rate_percentage}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.risk_distribution.high + stats.risk_distribution.critical} Allocations in High/Critical Tier</p>
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
            <h3 className="text-base font-bold text-slate-900">Allocation Explorer</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Filter by MP name, parliamentary term, civic category, state, and status. Inspect detailed financial breakdown and audit remarks.
            </p>
          </div>
          <Link to="/projects" className="inline-flex items-center text-xs font-semibold text-gov-navy hover:text-gov-navyLight mt-4">
            Explore dataset <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Anomaly Review Queue</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Prioritized queue of allocations with elevated risk signals across financial deviation (P90), stagnation, and administrative compliance.
            </p>
          </div>
          <Link to="/anomalies" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:text-amber-800 mt-4">
            Review flagged allocations <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Scoring Methodology</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transparent mathematical formulas, non-parametric percentiles (Median, P90), and ethical explainability safeguards.
            </p>
          </div>
          <Link to="/methodology" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 mt-4">
            View methodology <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
