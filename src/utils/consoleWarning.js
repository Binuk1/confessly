/**
 * Simple Console Security Warning
 * Shows a basic warning message when the script loads
 */

// Show warning immediately when script loads
try {
  // Big red STOP message
  console.log(
    '%c🛑 STOP!',
    'color: #ff0000; font-size: 50px; font-weight: bold; margin: 20px 0;'
  );
  
  // Warning message
  console.log(
    '%cThis is a browser feature intended for developers. If someone told you to copy and paste something here to enable a feature or "hack" someone\'s account, it is a scam and will give them access to your account.',
    'color: #ff4444; font-size: 16px; font-weight: bold; line-height: 1.5;'
  );
  
  // Security tips
  console.log(
    '%c⚠️ Security Tips:\n• Never paste code from untrusted sources\n• Scammers use this to steal accounts\n• Only developers should use this console',
    'color: #cc3333; font-size: 14px; line-height: 1.6;'
  );
  
  // Branding
  console.log(
    '%c— Confessly Security Team',
    'color: #666; font-size: 12px; font-style: italic;'
  );
  
} catch (error) {
  // Fallback for browsers that don't support console styling
  console.warn('🛑 STOP! This console is for developers only. Pasting code here can compromise your account!');
}
