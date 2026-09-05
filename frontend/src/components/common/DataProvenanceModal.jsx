import React from 'react';
import { 
  X, 
  Database, 
  Shield, 
  MapPin, 
  Calculator, 
  AlertOctagon, 
  FileCheck2,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const DataProvenanceModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gov-navy text-white px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 id="provenance-modal-title" className="text-lg font-bold tracking-tight">
                {t('provenance.modal_title', 'Data Provenance & Portfolio Scope')}
              </h2>
              <p className="text-xs text-slate-300">
                {t('provenance.modal_sub', 'Official source boundaries, definitions, and operational limitations')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          
          {/* Standing Disclaimer Alert */}
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-amber-900">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-950 uppercase tracking-wide">
                {t('provenance.governance_title', 'Responsible AI Governance:')}
              </span>
              <p>
                "{t('common.standing_disclaimer_body', 'Risk indicators are analytical signals intended to support review. They do not constitute proof of wrongdoing.')}"
              </p>
            </div>
          </div>

          {/* Grid 1: Data Source & Portfolio Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="gov-card p-4 bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-gov-navy font-bold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>{t('provenance.source_title', '1. Data Source')}</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm">
                {t('provenance.source_val', 'Official MoSPI MPLADS public/open data')}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('provenance.source_desc', 'Published constituency works and expenditure datasets from the Ministry of Statistics and Programme Implementation (MoSPI).')}
              </p>
            </div>

            <div className="gov-card p-4 bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-gov-navy font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>{t('provenance.scope_title', '2. Portfolio Scope')}</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm">
                {t('provenance.scope_val', '1,675 authentic constituency-level parliamentary allocation records')}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('provenance.scope_desc', 'Covering the 15th, 16th and 17th Lok Sabha (2009–2024 sessions). Exactly 0 synthetic records exist in production.')}
              </p>
            </div>
          </div>

          {/* 3. Record Identity & Identifier Semantics */}
          <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1.5">
            <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>{t('provenance.identity_title', '3. Record Identity & Index Key')}</span>
            </div>
            <p className="text-xs text-blue-950 leading-relaxed">
              {t('provenance.identity_desc', 'source_record_id (for example, LS17_0505) is an analytical dataset/index key, not a verified government work sanction number.')}
            </p>
          </div>

          {/* 4 & 5: Formulas and Spatial Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Financial Utilization */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>{t('provenance.utilization_title', '4. Financial Utilization Proxy')}</span>
              </div>
              <div className="bg-slate-100 p-2.5 rounded font-mono text-xs text-center font-bold text-slate-800 border border-slate-200">
                {t('provenance.utilization_formula', 'Financial Utilization Proxy = Expenditure / Sanctioned Cost × 100')}
              </div>
              <p className="text-xs text-slate-600 font-medium pt-1">
                ⚠️ {t('provenance.utilization_boundary', 'Explicit Boundary: This is a financial utilization proxy, NOT physical work progress.')}
              </p>
            </div>

            {/* Geographic Scope */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>{t('provenance.geo_title', '5. Geographic Scope')}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {t('provenance.geo_desc', 'District-level reference centroids are used for mapping (1,015 matched administrative centroids).')}
              </p>
              <p className="text-xs text-slate-600 font-medium pt-1">
                ⚠️ {t('provenance.geo_boundary', 'Explicit Boundary: These are NOT project-level GPS coordinates.')}
              </p>
            </div>

          </div>

          {/* 6. Data Limitations Checklist */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-slate-500" />
              <span>{t('provenance.limitations_title', '6. Public Open Data Boundaries & Limitations')}</span>
            </div>
            <p className="text-xs text-slate-600">
              {t('provenance.limitations_desc', 'In accordance with scientific and judicial integrity standards, this platform explicitly notes that the published public open dataset does not provide:')}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
              <li className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>{t('provenance.lim_contractor', 'Contractor / vendor records')}</span>
              </li>
              <li className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>{t('provenance.lim_invoice', 'Invoice / payment ledger transactions')}</span>
              </li>
              <li className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>{t('provenance.lim_physical', 'Physical engineering progress')}</span>
              </li>
              <li className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>{t('provenance.lim_duplicate', 'Verified duplicate-work ground truth')}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>MPLADS Samiksha · SIH PS 26102 Compliance Specifications</span>
          <button
            onClick={onClose}
            className="gov-btn-secondary py-1.5 px-4 text-xs font-semibold"
          >
            {t('common.close', 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DataProvenanceModal;
