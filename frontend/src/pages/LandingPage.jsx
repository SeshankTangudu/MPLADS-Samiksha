import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Users, Landmark, UserCog, Server, ArrowRight, CheckCircle2, Info, Lock, KeyRound, ExternalLink } from 'lucide-react';
import { useRole, ROLES } from '../context/RoleContext';
import { useLanguage } from '../i18n/LanguageContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { ROLES, isAuthenticated, currentUser } = useRole();
  const { t } = useLanguage();

  const handleSelectRole = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-10 space-y-10">
      
      {/* Header & Tagline */}
      <div className="text-center max-w-3xl space-y-4">
        <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-800 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>{t('landing.badge', 'One platform. Four specialized stakeholder views.')}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          {t('landing.title', 'MPLADS Samiksha')}
        </h1>
        <p className="text-lg sm:text-xl font-medium text-gov-navy">
          {t('landing.subtitle', 'Risk Intelligence, Operations & Public Accountability Platform')}
        </p>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t('landing.desc', 'Transparent oversight layer examining parliamentary constituency fund allocations across the 15th, 16th, 17th, and 18th Lok Sabha. Select your authorized stakeholder role to sign in to your dedicated workspace.')}
        </p>
      </div>

      {/* Role Selection Grid: 4 Stakeholder Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
        
        {/* 1. PUBLIC / CITIZEN CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-blue-600 bg-white group rounded-xl shadow-sm">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">{t('roles.citizen_role_badge', 'Public Portal')}</span>
              <h2 className="text-lg font-bold text-slate-900">{t('roles.citizen_title', 'Citizen / Public')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed min-h-[3rem]">
              {t('roles.citizen_desc', 'Explore parliamentary allocations, review multi-signal indicators, and submit field observation reports.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{t('landing.feat_allocations', 'Explore authentic allocations')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{t('landing.feat_risk', 'Multi-signal review factors')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{t('landing.feat_report', 'Submit discrepancy reports')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 space-y-2">
            <button
              onClick={() => handleSelectRole(ROLES.CITIZEN)}
              className="w-full gov-btn-primary bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Continue to Citizen Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/projects"
              className="w-full text-center block text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline py-1"
            >
              Explore Public Data (Read-Only) →
            </Link>
          </div>
        </div>

        {/* 2. MP / REPRESENTATIVE CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-amber-500 bg-white group rounded-xl shadow-sm">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{t('roles.mp_role_badge', 'Representative Portal')}</span>
              <h2 className="text-lg font-bold text-slate-900">{t('roles.mp_title', 'Member of Parliament')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed min-h-[3rem]">
              {t('roles.mp_desc', 'Track constituency portfolio, monitor risk alerts, add remarks, and request field verification.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{t('landing.feat_mp_constituency', 'Constituency portfolio tracking')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{t('landing.feat_mp_trajectory', 'Cross-term peer comparisons')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{t('landing.feat_mp_reports', 'Verification request workflow')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.MP)}
              className="w-full gov-btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Continue to MP Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. AUTHORITY / OFFICER CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-emerald-600 bg-white group rounded-xl shadow-sm">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{t('roles.authority_role_badge', 'Official Data Authority')}</span>
              <h2 className="text-lg font-bold text-slate-900">{t('roles.authority_title', 'District Authority / Auditor')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed min-h-[3rem]">
              {t('roles.authority_desc', 'Triage review queues, investigate allocations, and record official verified corrections.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{t('landing.feat_auth_queue', 'Prioritized anomaly review queue')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{t('landing.feat_auth_dossier', 'Official verified corrections')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{t('landing.feat_auth_evidence', 'Complaint resolution & notes')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.AUTHORITY)}
              className="w-full gov-btn-primary bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Continue to Authority Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. SYSTEM ADMINISTRATOR / PLATFORM OPS CARD */}
        <div className="gov-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-t-4 border-t-purple-600 bg-white group rounded-xl shadow-sm">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">{t('roles.admin_role_badge', 'Platform Authority')}</span>
              <h2 className="text-lg font-bold text-slate-900">{t('roles.system_admin_title', 'System Administrator')}</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed min-h-[3rem]">
              {t('roles.system_admin_desc', 'Operate dataset ingestion (18th Lok Sabha), data sources, health probes, and technical logging.')}
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span>{t('landing.feat_admin_ingest', '18th LS Dataset Ingestion Pipeline')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span>{t('landing.feat_admin_health', 'Deep System Health & Probes')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span>{t('landing.feat_admin_logs', 'Technical Logs & Audit Inspection')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectRole(ROLES.SYSTEM_ADMIN)}
              className="w-full gov-btn-primary bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Continue to Administrator Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Mandatory Least-Privilege Role Disclosure Notice */}
      <div className="max-w-4xl w-full mx-auto px-4">
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800">{t('landing.disclosure_title', 'Least-Privilege Role Separation Architecture')}:</span>
            <p className="text-slate-600 leading-relaxed">
              {t('landing.disclosure_text', 'MPLADS Samiksha enforces strict least privilege: Authority controls verified official records and investigation notes; System Administrator manages data ingestion pipelines and platform infrastructure; and AI risk scores remain strictly immutable to human overrides.')}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
