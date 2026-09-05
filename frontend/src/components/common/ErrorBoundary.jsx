import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { en } from '../../i18n/locales/en';
import { hi } from '../../i18n/locales/hi';
import { bn } from '../../i18n/locales/bn';
import { te } from '../../i18n/locales/te';
import { mr } from '../../i18n/locales/mr';
import { ta } from '../../i18n/locales/ta';

const dicts = { en, hi, bn, te, mr, ta };

function getErrorText(key, fallback) {
  try {
    const lang = localStorage.getItem('mplads_lang') || 'en';
    const dict = dicts[lang] || dicts.en;
    const parts = key.split('.');
    let val = dict;
    for (const p of parts) {
      val = val ? val[p] : undefined;
    }
    return (typeof val === 'string' && val.trim() !== '') ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="gov-card max-w-md p-6 text-center border-red-200 bg-red-50/50">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {getErrorText('error.title', 'System Error')}
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              {this.state.error?.message || getErrorText('error.desc', 'An unexpected error occurred while rendering this interface.')}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gov-navy text-white text-xs font-semibold rounded-md hover:bg-gov-navyLight transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{getErrorText('error.reload', 'Reload Application')}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
