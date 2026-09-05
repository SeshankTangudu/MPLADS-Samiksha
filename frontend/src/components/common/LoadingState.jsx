import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const LoadingState = ({ message }) => {
  const { t } = useLanguage();
  const displayMsg = message || t('common.loading', 'Loading analytical records...');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-8 h-8 text-gov-navyLight animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{displayMsg}</p>
      <p className="text-xs text-slate-400 mt-1">{t('loading.text', 'Retrieving indexed intelligence data...')}</p>
    </div>
  );
};

export default LoadingState;
