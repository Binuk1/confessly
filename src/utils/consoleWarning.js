import { translations } from './translations';

/**
 * Console Security Warning
 * Shows a localized warning message in the browser console
 */

// Get browser language (first 2 chars) or default to English
const getBrowserLanguage = () => {
  try {
    return (navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase();
  } catch (e) {
    return 'en';
  }
};

// Get translation for current language, fallback to English
const t = (key) => {
  const lang = getBrowserLanguage();
  const langTranslations = translations[lang] || translations.en;
  return langTranslations[key] || translations.en[key] || key;
};

// Show warning immediately when script loads
try {
  const styles = {
    stop: 'color: #ff0000; font-size: 50px; font-weight: bold; margin: 20px 0;',
    warning: 'color: #ff4444; font-size: 16px; font-weight: bold; line-height: 1.5;',
    tips: 'color: #cc3333; font-size: 14px; line-height: 1.6;',
    brand: 'color: #666; font-size: 12px; font-style: italic;'
  };

  // Big red STOP message
  console.log(`%c${t('stop')}`, styles.stop);
  
  // Warning message
  console.log(`%c${t('warning')}`, styles.warning);
  
  // Security tips
  if (t('tips')) {
    console.log(`%c${t('tips')}`, styles.tips);
  }
  
  // Branding
  console.log(`%c— ${t('brand') || 'Confessly Security Team'}`, styles.brand);
} catch (e) {
  // Fallback for browsers that don't support console styling
  console.warn('🛑 STOP! This console is for developers only. Pasting code here can compromise your account!');
}
