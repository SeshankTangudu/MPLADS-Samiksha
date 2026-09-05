import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const LANG_CONFIG = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

export const LanguageSelector = () => {
  const { lang, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentConfig = LANG_CONFIG.find(l => l.code === lang) || LANG_CONFIG[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-100 border border-slate-700 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select Application Language"
      >
        <Globe className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="font-medium text-slate-100">{currentConfig.native}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1.5 w-44 rounded-lg shadow-xl bg-slate-900 border border-slate-700 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            UI Language / ভাষা
          </div>
          {LANG_CONFIG.map((l) => {
            const isSelected = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  changeLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{l.native}</span>
                  {l.code !== 'en' && <span className="text-[10px] text-slate-400">({l.label})</span>}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
