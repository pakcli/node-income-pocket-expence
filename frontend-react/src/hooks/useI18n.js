import { useState, useEffect } from 'react';
import { i18n } from '../services/i18n.js';

export function useI18n() {
  const [locale, setLocale] = useState(() => i18n.currentLocale);

  useEffect(() => {
    const handleLocaleChange = (e) => {
      setLocale(e.detail.locale);
    };

    window.addEventListener('localeChanged', handleLocaleChange);
    return () => window.removeEventListener('localeChanged', handleLocaleChange);
  }, []);

  const toggleLocale = () => {
    const next = locale === 'id' ? 'en' : 'id';
    i18n.setLocale(next);
  };

  return {
    locale,
    t: (key) => i18n.t(key),
    formatCurrency: (val) => i18n.formatCurrency(val),
    formatDate: (val) => i18n.formatDate(val),
    toggleLocale
  };
}
