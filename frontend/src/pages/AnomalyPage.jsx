import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const AnomalyPage = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Anomaly Intelligence Center</h1>
          <p className="text-xs text-slate-500 mt-1">Prioritized risk queue ranked by multi-signal anomaly scores with reason breakdowns</p>
        </div>
      </div>

      <div className="gov-card p-8 text-center text-slate-500">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
        <h3 className="text-sm font-semibold text-slate-700">Prioritized Review Queue</h3>
        <p className="text-xs text-slate-400 mt-1">Ready for contract-bound anomaly tables and risk badges in T17.</p>
      </div>
    </div>
  );
};

export default AnomalyPage;
