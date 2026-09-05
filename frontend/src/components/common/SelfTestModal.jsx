import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Scale,
  Sparkles
} from 'lucide-react';
import { SelfTestAPI } from '../../services/api';
import LoadingState from './LoadingState';
import { useLanguage } from '../../i18n/LanguageContext';

export const SelfTestModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFixture, setSelectedFixture] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const loadFixtures = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await SelfTestAPI.getFixtures();
          setFixtures(data || []);
          if (data && data.length > 0) {
            setSelectedFixture(data[0]);
          }
        } catch (err) {
          console.error('Failed to load self-test fixtures:', err);
          setError(err.message || 'Failed to load synthetic test fixtures.');
        } finally {
          setLoading(false);
        }
      };
      loadFixtures();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30 text-amber-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('selftest.title', 'Engine Self-Test & Boundary Verification Mode')}</h2>
              <p className="text-xs text-slate-400">{t('selftest.sub', 'Isolated evaluation scenarios testing Model A boundary conditions')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Synthetic Warning Banner */}
        <div className="bg-amber-500 text-slate-950 px-5 py-2.5 text-xs font-bold flex items-center justify-between border-b border-amber-600 shadow-inner">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>SYNTHETIC VALIDATION DATA — NOT GOVERNMENT DATA. {t('selftest.immutability_note', 'Strictly isolated from production database and stats.')}</span>
          </div>
          <span className="text-[10px] bg-slate-950 text-amber-400 px-2 py-0.5 rounded font-mono">{t('selftest.demo_mode', 'DEMO / QA MODE')}</span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {loading ? (
            <div className="py-12">
              <LoadingState message={t('loading.default', 'Executing live synthetic Model A scoring evaluation...')} />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Fixture Selector List */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  {t('selftest.scenarios_title', 'Test Scenarios')} ({fixtures.length})
                </label>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {fixtures.map((f) => {
                    const isSelected = selectedFixture?.id === f.id;
                    const tier = f.evaluation.risk_level;
                    const isCrit = tier === 'Critical';
                    const isHigh = tier === 'High';
                    const isMed = tier === 'Medium';
                    
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFixture(f)}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-xs space-y-1 ${
                          isSelected
                            ? 'bg-blue-50 border-gov-navy text-gov-navy shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[11px] font-mono">{f.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCrit ? 'bg-red-100 text-red-800' :
                            isHigh ? 'bg-amber-100 text-amber-800' :
                            isMed ? 'bg-yellow-100 text-yellow-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tier} ({f.evaluation.total_score})
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 leading-tight">{f.scenario_title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fixture Detail & Score Decomposition */}
              {selectedFixture && (
                <div className="md:col-span-2 space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{selectedFixture.scenario_title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{selectedFixture.scenario_description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-gov-navy font-mono">
                        {selectedFixture.evaluation.total_score}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase">{t('common.score', 'Composite Score')}</span>
                    </div>
                  </div>

                  {/* Input Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">{t('common.sanctioned', 'Sanctioned')}</span>
                      <span className="font-bold text-slate-800">₹{selectedFixture.sanctioned_cost} {t('common.crores', 'Cr')}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">{t('common.expenditure', 'Expenditure')}</span>
                      <span className="font-bold text-slate-800">₹{selectedFixture.expenditure} {t('common.crores', 'Cr')}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">{t('map.unspent_balance', 'Unspent')}</span>
                      <span className="font-bold text-slate-800">₹{selectedFixture.unspent_balance} {t('common.crores', 'Cr')}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">{t('common.status', 'Status')} / {t('common.term', 'Term')}</span>
                      <span className="font-bold text-slate-800">{selectedFixture.status} (LS{selectedFixture.lok_sabha_term})</span>
                    </div>
                  </div>

                  {/* Dimension Fingerprint Breakdown */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      {t('selftest.dim_breakdown', 'Model A Dimension Breakdown (Theoretical Max 100)')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">{t('methodology.financial_dim', 'Financial')}</span>
                        <span className="font-bold text-slate-900">{selectedFixture.evaluation.financial_score} / 35</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">{t('methodology.timeline_dim', 'Timeline')}</span>
                        <span className="font-bold text-slate-900">{selectedFixture.evaluation.timeline_score} / 25</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">{t('methodology.dq_dim', 'Compliance')}</span>
                        <span className="font-bold text-slate-900">{selectedFixture.evaluation.data_quality_score} / 20</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">{t('methodology.geo_dim', 'Geographic')}</span>
                        <span className="font-bold text-slate-900">{selectedFixture.evaluation.geographic_score} / 10</span>
                      </div>
                    </div>
                  </div>

                  {/* Generated ReasonCards */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      {t('selftest.reason_cards_title', 'Generated ReasonCards')} ({selectedFixture.evaluation.flags.length})
                    </label>
                    {selectedFixture.evaluation.flags.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-white p-3 rounded border border-slate-200">
                        {t('selftest.zero_flags', 'Zero anomaly flags generated. Allocation is within normal cohort parameters.')}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedFixture.evaluation.flags.map((flag, idx) => (
                          <div key={idx} className="p-2.5 bg-white rounded border border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">{flag.title}</span>
                              <span className="text-[10px] font-mono font-bold text-gov-navy px-1.5 py-0.5 bg-slate-100 rounded">
                                {flag.flag_type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight">{flag.explanation}</p>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <div><strong>{t('selftest.observed', 'Observed:')}</strong> {flag.observed_value}</div>
                              <div><strong>{t('selftest.threshold', 'Threshold:')}</strong> {flag.threshold_value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
          <span>{t('selftest.engine_verification', 'Model A Deterministic Scoring Engine Verification')}</span>
          <button onClick={onClose} className="gov-btn-secondary py-1.5 px-4 text-xs">
            {t('common.close', 'Close Self-Test Mode')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelfTestModal;
