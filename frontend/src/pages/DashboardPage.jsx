import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';

export const DashboardPage = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Portfolio overview, risk distribution, and macro indicators across Lok Sabha terms</p>
        </div>
      </div>

      <div className="gov-card p-8 text-center text-slate-500">
        <BarChart3 className="w-10 h-10 text-gov-navyLight mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-700">Dashboard Metrics & Visualizations</h3>
        <p className="text-xs text-slate-400 mt-1">Ready for contract-bound API wiring in T15.</p>
      </div>
    </div>
  );
};

export default DashboardPage;
