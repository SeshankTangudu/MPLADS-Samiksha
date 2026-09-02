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
  FileCheck
} from 'lucide-react';
import { ProjectsAPI } from '../services/api';
import LoadingState from '../components/common/LoadingState';

export const InvestigationPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              <ArrowLeft className="w-4 h-4" /> Back to Anomaly Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { allocation, risk_assessment, reasons, peer_comparables, disclaimer } = data;

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

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
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
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Constituency Allocation Deep Investigation
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getRiskTierBadge(risk_assessment.risk_level, risk_assessment.total_score)}
        </div>
      </div>

      {/* Allocation Profile & Financial Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Metadata Card */}
        <div className="gov-card p-6 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Landmark className="w-4 h-4 text-gov-navy" />
            Parliamentary Entity Metadata
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Member of Parliament</span>
              <span className="text-sm font-bold text-slate-900 block">{allocation.mp_name}</span>
              <span className="text-[11px] text-slate-500">{allocation.house}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">Constituency</span>
                <span className="font-semibold text-slate-800">{allocation.constituency || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">State / UT</span>
                <span className="font-semibold text-slate-800">{allocation.state}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block font-medium">District (Centroid)</span>
                <span className="font-semibold text-slate-800">{allocation.district}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Civic Sector</span>
                <span className="font-semibold text-slate-800">{allocation.category}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500 block font-medium">Lifecycle Status</span>
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
              Financial Deployment Profile
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Sanctioned Works Budget</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">₹{allocation.sanctioned_cost.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Total approved</span>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="text-[11px] text-gov-navy block font-medium">Reported Expenditure</span>
                <span className="text-lg font-black text-gov-navy mt-1 block">₹{allocation.expenditure.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Cumulative incurred</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-800 block font-medium">Released by MoSPI</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">₹{allocation.released_amount.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Disbursed funds</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-800 block font-medium">Unspent Balance</span>
                <span className="text-lg font-black text-amber-700 mt-1 block">₹{allocation.unspent_balance.toFixed(2)} Cr</span>
                <span className="text-[10px] text-slate-400">Remaining in account</span>
              </div>
            </div>

            {/* Financial Utilization Progress Meter */}
            <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  Financial Utilization Proxy:
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
                Reflects cumulative reported expenditure against sanctioned works budget.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytical Risk Score Decomposition */}
      <div className="gov-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-gov-navy" />
              Composite Risk Score Decomposition (Max 100)
            </h3>
            <p className="text-xs text-slate-500">Additive multi-signal formulation: FIN (35) + TIM (25) + DQ (20) + GEO (10) + DUP (10)</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Computed: {risk_assessment.computed_at?.split('T')[0]}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Financial Deviation */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Financial Deviation</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.financial_score} / 35</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gov-navy h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.financial_score / 35) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">P90 peer cohort deviation</p>
          </div>

          {/* Timeline Stagnation */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Timeline Stagnation</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.timeline_score} / 25</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gov-navyLight h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.timeline_score / 25) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Multi-year active status</p>
          </div>

          {/* Data Quality */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Compliance & Audit</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.data_quality_score} / 20</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.data_quality_score / 20) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Audit/MPR certificate notes</p>
          </div>

          {/* Geographic */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Spatial Density</span>
              <span className="text-xs font-bold text-gov-navy">{risk_assessment.geographic_score} / 10</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${(risk_assessment.geographic_score / 10) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">District concentration factor</p>
          </div>
        </div>
      </div>

      {/* Explainable Reason Cards Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Explainable Analytical Reason Signals ({reasons.length})
          </h3>
          <span className="text-xs text-slate-500">Deterministic decomposition against peer baselines</span>
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
                <th>Constituency</th>
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
    </div>
  );
};

export default InvestigationPage;
