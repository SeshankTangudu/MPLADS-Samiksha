import React, { useState, useRef, useEffect } from 'react';
import { UserCheck, ChevronDown, Check, ShieldAlert, Users, Landmark, UserCog, Info } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const RoleSelector = () => {
  const { viewRole, changeRole, selectedConstituency, changeConstituency, ROLES, ROLE_LABELS, PROTOTYPE_CONSTITUENCIES } = useRole();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role) => {
    switch (role) {
      case ROLES.CITIZEN:
        return <Users className="w-3.5 h-3.5 text-blue-400" />;
      case ROLES.MP:
        return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
      case ROLES.AUTHORITY:
        return <UserCog className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case ROLES.CITIZEN:
        return t('roles.citizen_title', 'Citizen / Public');
      case ROLES.MP:
        return t('roles.mp_title', 'MP / Representative');
      case ROLES.AUTHORITY:
        return t('roles.authority_title', 'Authority / Officer');
      default:
        return ROLE_LABELS[role] || role;
    }
  };

  return (
    <div className="relative flex items-center space-x-2" ref={dropdownRef}>
      {/* Role Selector Button */}
      <div className="relative inline-block text-left">
        <button
          id="role-selector-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700/90 text-xs font-semibold text-slate-100 border border-slate-700 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={t('roles.switch_role', 'Switch Prototype View Role')}
        >
          {getRoleIcon(viewRole)}
          <span className="text-slate-300 font-normal">{t('roles.current_view', 'Viewing as')}:</span>
          <span className="font-bold text-slate-100">{getRoleLabel(viewRole)}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="origin-top-right absolute right-0 mt-1.5 w-64 rounded-lg shadow-xl bg-slate-900 border border-slate-700 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between items-center">
              <span>{t('landing.disclosure_title', 'Prototype Role Simulator')}</span>
              <span className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded text-[9px]">{t('roles.demo_badge', 'Demo')}</span>
            </div>

            {/* Role Options */}
            <div className="py-1">
              <button
                onClick={() => { changeRole(ROLES.CITIZEN); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  viewRole === ROLES.CITIZEN ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">{t('roles.citizen_title', 'Citizen / Public')}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t('roles.citizen_desc', 'Explore allocations & report discrepancies')}</div>
                  </div>
                </div>
                {viewRole === ROLES.CITIZEN && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              <button
                onClick={() => { changeRole(ROLES.MP); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  viewRole === ROLES.MP ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">{t('roles.mp_title', 'MP / Representative')}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t('roles.mp_desc', 'Monitor constituency & review reports')}</div>
                  </div>
                </div>
                {viewRole === ROLES.MP && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                onClick={() => { changeRole(ROLES.AUTHORITY); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  viewRole === ROLES.AUTHORITY ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCog className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">{t('roles.authority_title', 'Authority / Officer')}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t('roles.authority_desc', 'Full analytical intelligence & workflow')}</div>
                  </div>
                </div>
                {viewRole === ROLES.AUTHORITY && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>

            {/* Prototype Disclaimer */}
            <div className="px-3 pt-2 mt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-start space-x-1.5">
              <Info className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="leading-tight">
                {t('roles.simulation_notice', 'Prototype role simulation. Production deployment would require authenticated identity and authorization controls.')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MP Prototype Constituency Selector (Visible only when in MP Role View) */}
      {viewRole === ROLES.MP && (
        <div className="relative inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-xs">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider hidden md:inline">
            {t('mp.constituency_label', 'My Constituency:')}
          </span>
          <select
            id="mp-constituency-selector"
            aria-label={t('mp.select_constituency', 'Prototype MP Constituency Selection')}
            value={selectedConstituency}
            onChange={(e) => changeConstituency(e.target.value)}
            className="bg-slate-800 text-amber-300 text-xs font-semibold py-0.5 px-2 rounded border border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[170px] sm:max-w-xs truncate"
            title={t('mp.select_constituency', 'Simulated prototype constituency selection')}
          >
            {PROTOTYPE_CONSTITUENCIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-slate-100">
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
