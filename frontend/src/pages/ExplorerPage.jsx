import React from 'react';
import { Search } from 'lucide-react';

export const ExplorerPage = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Explorer</h1>
          <p className="text-xs text-slate-500 mt-1">Search, filter, and inspect project records across states, categories, and risk tiers</p>
        </div>
      </div>

      <div className="gov-card p-8 text-center text-slate-500">
        <Search className="w-10 h-10 text-gov-navyLight mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-700">Project Exploration Engine</h3>
        <p className="text-xs text-slate-400 mt-1">Ready for contract-bound table pagination and filtering in T16.</p>
      </div>
    </div>
  );
};

export default ExplorerPage;
