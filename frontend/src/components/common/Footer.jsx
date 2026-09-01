import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gov-navyDark text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-slate-200 font-semibold">MPLADS Samiksha Intelligence Layer</span>
            <span className="text-slate-500">|</span>
            <span>Deterministic Anomaly Scoring</span>
          </div>

          <div className="text-center md:text-right text-slate-500">
            <p>Data source: Ministry of Statistics and Programme Implementation (MoSPI) / e-SAKSHI snapshot.</p>
            <p className="mt-0.5 text-[11px]">All scoring algorithms offline batch processed. Runtime read-only API.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
