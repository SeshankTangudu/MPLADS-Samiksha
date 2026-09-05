import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, Landmark, UserCog, ArrowRight, CheckCircle2, Info, Lock } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { useLanguage } from '../i18n/LanguageContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { changeRole, ROLES } = useRole();
  const { t } = useLanguage();

  const handleSelectRole = (role) => {
    changeRole(role);
    navigate(role === ROLES.MP ? '/projects' : role === ROLES.AUTHORITY ? '/dashboard' : '/');
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-10 space-y-10">
      
      {/* Header & Tagline */}
      <div className="text-center max-w-3xl space-y-4">
        <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-800 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>{t('landing.badge', 'One platform. Three stakeholder views.')}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          {t('landing.title', 'MPLADS Samiksha')}
        </h1>
        <p className="text-lg sm:text-xl font-medium text-gov-navy">
          {t('landing.subtitle', 'Risk Intelligence & Public Accountability Platform')}
        </p>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t('landing.desc', 'Transparent oversight layer examining 1,675 parliamentary constituency fund allocations (15th, 16th & 17th Lok Sabha). Select a stakeholder role to enter the interactive analytical workspace.')}
        </p>
      </div>

      {/* Prototype Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
        
        {/* PUBLIC / CITIZEN CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-blue-600 bg-white group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">{t('roles.citizen_role_badge', 'Public View')}</span>
              <h2 className="text-xl font-bold text-slate-900">{t('roles.citizen_title', 'Public / Citizen')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('roles.citizen_desc', 'Explore parliamentary allocations, understand analytical review indicators, examine project details, and report discrepancies.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('landing.feat_allocations', 'Explore 1,675 authentic allocations')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('landing.feat_risk', 'Understand multi-signal risk factors')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('landing.feat_report', 'Report field discrepancies with tracking ID')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.CITIZEN)}
              className="w-full gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('roles.enter_citizen', 'Enter Public / Citizen View')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MP / REPRESENTATIVE CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-amber-500 bg-white group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{t('roles.mp_role_badge', 'Representative View')}</span>
              <h2 className="text-xl font-bold text-slate-900">{t('roles.mp_title', 'Member of Parliament (MP)')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('roles.mp_desc', 'Track constituency fund utilization, explore multi-signal risk assessments, monitor citizen discrepancy reports, and request official field verifications.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('landing.feat_mp_constituency', 'Constituency-level portfolio tracking')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('landing.feat_mp_trajectory', 'Cross-term trajectory & peer comparison')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('landing.feat_mp_reports', 'Constituent reports & verification requests')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.MP)}
              className="w-full gov-btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('roles.enter_mp', 'Enter MP Workspace')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AUTHORITY / OFFICER CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-emerald-600 bg-white group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{t('roles.authority_role_badge', 'Auditor View')}</span>
              <h2 className="text-xl font-bold text-slate-900">{t('roles.authority_title', 'District Authority / Nodal Officer')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('roles.authority_desc', 'Access prioritized review queues, investigate flagged allocations, review citizen reports, examine evidence metadata, and record administrative audit notes.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('landing.feat_auth_queue', 'Prioritized anomaly review queue')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('landing.feat_auth_dossier', 'Comprehensive audit case files & notes')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('landing.feat_auth_evidence', 'Citizen report triage & photo metadata')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.AUTHORITY)}
              className="w-full gov-btn-primary bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{t('roles.enter_authority', 'Enter Authority Workspace')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Mandatory Prototype Disclaimer Notice */}
      <div className="max-w-3xl w-full mx-auto px-4">
        <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800">{t('landing.disclosure_title', 'Prototype Role Simulator Disclosure')}:</span>
            <p className="text-slate-600">
              {t('landing.disclosure_text', 'This prototype allows instantaneous switching between stakeholder roles (Public/Citizen, MP, and District Authority) to evaluate role-specific intelligence workflows. In production, access is governed by institutional authentication.')}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
