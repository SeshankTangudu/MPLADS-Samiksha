import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { bn } from './locales/bn';
import { te } from './locales/te';
import { mr } from './locales/mr';
import { ta } from './locales/ta';

const dictionaries = { en, hi, bn, te, mr, ta };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('mplads_lang');
      return saved && dictionaries[saved] ? saved : 'en';
    } catch (e) {
      return 'en';
    }
  });

  const changeLanguage = (newLang) => {
    if (dictionaries[newLang]) {
      setLang(newLang);
      try {
        localStorage.setItem('mplads_lang', newLang);
      } catch (e) {
        console.warn('Failed to save language preference:', e);
      }
    }
  };

  /**
   * Translate function
   * @param {string} key - e.g. "nav.overview" or "common.search"
   * @param {string} [fallbackText] - Optional explicit fallback text
   * @returns {string}
   */
  const t = (key, fallbackText) => {
    try {
      if (!key) return fallbackText || '';
      if (typeof key !== 'string') return String(fallbackText || key);

      const keys = key.split('.');
      
      // 1. Try current selected language
      let value = dictionaries[lang];
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }

      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }

      // 2. Fallback to English
      if (lang !== 'en') {
        let enValue = dictionaries.en;
        for (const k of keys) {
          if (enValue && typeof enValue === 'object') {
            enValue = enValue[k];
          } else {
            enValue = undefined;
            break;
          }
        }
        if (typeof enValue === 'string' && enValue.trim() !== '') {
          return enValue;
        }
      }

      // 3. Fallback to explicit parameter or key
      return (typeof fallbackText === 'string' && fallbackText.trim() !== '') ? fallbackText : key;
    } catch (e) {
      console.warn('Error evaluating translation key:', key, e);
      return fallbackText || String(key || '');
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t, languages: Object.keys(dictionaries) }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
