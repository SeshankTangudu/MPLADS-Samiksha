import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, Shield, MapPin, Calculator, ExternalLink } from 'lucide-react';
import DataProvenanceModal from './DataProvenanceModal';
import { useLanguage } from '../../i18n/LanguageContext';

export const DataProvenanceCard = () => {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="gov-card p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gov-navy/10 rounded-lg text-gov-navy flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                  {t('provenance.badge_title', 'Data Provenance & Scope')}
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded border border-blue-200">
                  MoSPI Open Data
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('provenance.badge_sub', '1,675 authentic constituency allocations (15th, 16th & 17th Lok Sabha) · District centroid mapping · Financial utilization proxy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-200/60 flex items-center gap-1 transition-colors"
              aria-expanded={expanded}
              aria-label="Toggle brief summary"
            >
              <span>{expanded ? t('common.less_info', 'Less Info') : t('common.quick_summary', 'Quick Summary')}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              id="btn-open-provenance-modal"
              onClick={() => setModalOpen(true)}
              className="gov-btn-secondary text-xs py-1.5 px-3 bg-white hover:bg-slate-50 text-gov-navy border-slate-300 shadow-xs flex items-center gap-1.5 font-semibold"
            >
              <span>{t('common.data_boundaries_btn', 'Data Boundaries & Limitations')}</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>
          </div>

        </div>

        {/* Collapsible Quick Summary */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 animate-in fade-in duration-150">
            <div className="space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" /> {t('provenance.utilization_title', 'Financial Utilization')}
              </span>
              <p>
                Calculated as <code className="text-slate-800 font-mono">expenditure / sanctioned_cost × 100</code>. This is a financial proxy, NOT physical work progress.
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> {t('provenance.geo_title', 'Geographic Scope')}
              </span>
              <p>
                Mapped across 1,015 district reference centroids. These are NOT project-level micro GPS coordinates.
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> {t('provenance.identity_title', 'Index Identity Key')}
              </span>
              <p>
                <code className="text-slate-800 font-mono font-bold">source_record_id</code> is an analytical index key, not a government work sanction number.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Modal */}
      <DataProvenanceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default DataProvenanceCard;
