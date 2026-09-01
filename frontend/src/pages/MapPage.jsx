import React from 'react';
import { MapPin } from 'lucide-react';

export const MapPage = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Geographic Risk Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">District-level distribution and spatial risk concentration map</p>
        </div>
      </div>

      <div className="gov-card p-8 text-center text-slate-500">
        <MapPin className="w-10 h-10 text-gov-navyLight mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-slate-700">Geographic Visualization (Leaflet)</h3>
        <p className="text-xs text-slate-400 mt-1">Ready for centroid mapping and district layer integration in T19.</p>
      </div>
    </div>
  );
};

export default MapPage;
