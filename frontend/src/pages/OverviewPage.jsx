import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, AlertTriangle, ArrowRight, BarChart2, Database } from 'lucide-react';

export const OverviewPage = () => {
  return (
    <div className="space-y-8 py-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gov-navyDark via-gov-navy to-gov-navyLight text-white rounded-xl p-8 shadow-lg">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            <span>Review Intelligence Layer</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">
            MPLADS Project Risk & Anomaly Intelligence
          </h1>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
            An explainable, audit-grade intelligence layer over MPLADS project data. Ranks anomalies across financial cohorts, timeline stagnation, and data quality signals to support oversight officials and citizens.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md"
            >
              <span>Explore Analytics Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/anomalies"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg border border-white/20 transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Review Flagged Anomalies</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="gov-card p-6 border-l-4 border-l-gov-navy">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-gov-navy flex items-center justify-center mb-4">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Cohort-Relative Scoring</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Evaluates project costs and expenditure rates against peer category and state distributions (P90 thresholds).
          </p>
          <Link to="/dashboard" className="text-xs font-semibold text-gov-navy hover:text-gov-navyLight inline-flex items-center space-x-1">
            <span>View Distribution</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="gov-card p-6 border-l-4 border-l-amber-500">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Explainable Reasoning</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Every risk flag produces structured baseline comparisons: observed vs median baseline vs cohort threshold.
          </p>
          <Link to="/anomalies" className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center space-x-1">
            <span>Inspect Reasons</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="gov-card p-6 border-l-4 border-l-emerald-600">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Data Provenance & Audit</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Full transparency on dated official MoSPI snapshots with zero runtime hallucinations and reproducible offline pipelines.
          </p>
          <Link to="/methodology" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center space-x-1">
            <span>Read Methodology</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
