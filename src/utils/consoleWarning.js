import { translations } from './translations';

/**
 * Console Security Warning
 * Shows a localized warning message in the browser console
 */

const getBrowserLanguage = () => {
  try {
    return (navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase();
  } catch (e) {
    return 'en';
  }
};

const t = (key) => {
  const lang = getBrowserLanguage();
  const langTranslations = translations[lang] || translations.en;
  return langTranslations[key] || translations.en[key] || key;
};

try {
  const styles = {
    stop: 'color: #ff0000; font-size: 50px; font-weight: bold; margin: 20px 0;',
    warning: 'color: #ff4444; font-size: 16px; font-weight: bold; line-height: 1.5;',
    tips: 'color: #cc3333; font-size: 14px; line-height: 1.6;',
    brand: 'color: #666; font-size: 12px; font-style: italic;'
  };

  console.log(`%c${t('stop')}`, styles.stop);
  console.log(`%c${t('warning')}`, styles.warning);
  console.log(`%c${t('tips')}`, styles.tips);
  console.log(`%c— ${t('brand') || 'Confessly Security Notice'}`, styles.brand);
} catch (e) {
  console.warn('🛑 STOP! This console is for developers only. Do not paste anything here.');
}
