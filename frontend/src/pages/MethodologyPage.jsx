import React from 'react';
import { BookOpen, ShieldCheck, Scale } from 'lucide-react';

export const MethodologyPage = () => {
  return (
    <div className="space-y-6 py-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Scoring Methodology & Transparency</h1>
        <p className="text-xs text-slate-500 mt-1">Mathematical formulations, weights, cohort definitions, and baseline thresholds</p>
      </div>

      <div className="gov-card p-6 space-y-4">
        <div className="flex items-center space-x-2 text-gov-navy font-bold text-sm">
          <Scale className="w-4 h-4" />
          <span>Multi-Signal Composite Formulation</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          The risk score is calculated offline using deterministic rules across four objective dimensions:
        </p>
        <div className="bg-slate-50 p-3 rounded font-mono text-xs text-slate-800 border border-slate-200">
          Raw Score = 35·FIN + 25·TIM + min(20, 5·DQ) + 10·GEO + 10·DUP<br/>
          Final Score = min(100, Raw Score)
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
          <li><strong>0–24: Low Risk</strong> — Normal cohort parameters</li>
          <li><strong>25–49: Medium Risk</strong> — Minor deviation or documentation item</li>
          <li><strong>50–74: High Risk</strong> — Significant financial/timeline anomaly</li>
          <li><strong>75–100: Critical Risk</strong> — Multi-signal compounding outlier</li>
        </ul>
      </div>
    </div>
  );
};

export default MethodologyPage;
