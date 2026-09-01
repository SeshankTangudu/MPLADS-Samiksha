import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const InvestigationPage = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <Link to="/anomalies" className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Deep Investigation</h1>
          <p className="text-xs text-slate-500">Record ID: {id || 'Select a project'}</p>
        </div>
      </div>

      <div className="gov-card p-8 text-center text-slate-500">
        <ShieldAlert className="w-10 h-10 text-gov-navyLight mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-700">Decomposition & Peer Comparison</h3>
        <p className="text-xs text-slate-400 mt-1">Ready for ReasonCards and peer cohort comparables in T18.</p>
      </div>
    </div>
  );
};

export default InvestigationPage;
