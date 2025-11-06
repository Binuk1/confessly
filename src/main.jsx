import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Import components (using dynamic imports)
let App, StaffLogin, StaffDashboard, ManageStaff, ReportsManagement, BannedIPsManagement, PrivacyPolicy, TermsAndConditions;

// Create a function to load all components
async function loadComponents() {
  [
    { module: import('./App.jsx'), name: 'App' },
    { module: import('./components/staff/StaffLogin.jsx'), name: 'StaffLogin' },
    { module: import('./components/staff/StaffDashboard.jsx'), name: 'StaffDashboard' },
    { module: import('./components/staff/ManageStaff.jsx'), name: 'ManageStaff' },
    { module: import('./components/staff/ReportsManagement.jsx'), name: 'ReportsManagement' },
    { module: import('./components/staff/BannedIPsManagement.jsx'), name: 'BannedIPsManagement' },
    { module: import('./pages/PrivacyPolicy.jsx'), name: 'PrivacyPolicy' },
    { module: import('./pages/TermsAndConditions.jsx'), name: 'TermsAndConditions' }
  ].forEach(async ({ module, name }) => {
    try {
      const component = await module;
      window[name] = component.default;
      return component.default;
    } catch (error) {
      console.error(`Failed to load component ${name}:`, error);
      return null;
    }
  });
}

// Track if splash should be hidden
let splashHidden = false;
let splashHideCallback = null;

// Expose a small helper to hide the initial inline splash
function hideInitialSplash() {
  if (splashHidden) return;
  
  splashHidden = true;
  const splash = document.getElementById('initial-splash');
  if (!splash) return;
  
  splash.classList.add('hide');
  // Remove from DOM after transition to avoid overlay intercepting clicks
  setTimeout(() => splash.remove(), 550);
  
  // Call any pending callback
  if (splashHideCallback) {
    splashHideCallback();
    splashHideCallback = null;
  }
}

// Function to wait for splash hide (for App.jsx to use)
function waitForSplashHide() {
  return new Promise((resolve) => {
    if (splashHidden) {
      resolve();
    } else {
      splashHideCallback = resolve;
    }
  });
}

// If the user requested specific static pages (privacy / terms), don't show the app splash — hide it immediately
// This makes direct navigation to those pages load without the loading wall overlay.
if (typeof window !== 'undefined') {
  const path = window.location.pathname;
  if (path === '/privacy-policy' || path === '/terms') {
    // Hide synchronously (will add hide class and remove after transition)
    hideInitialSplash();
  }
}

// Function to render the app once components are loaded
async function initializeApp() {
  try {
    await loadComponents();
    
    // Ensure all components are loaded
    const requiredComponents = [
      'App', 'StaffLogin', 'StaffDashboard', 'ManageStaff',
      'ReportsManagement', 'BannedIPsManagement', 'PrivacyPolicy', 'TermsAndConditions'
    ];
    
    const missing = requiredComponents.filter(comp => !window[comp]);
    if (missing.length > 0) {
      console.error('Missing components:', missing);
      return;
    }
    
    const root = createRoot(document.getElementById('root'));
    root.render(
      <StrictMode>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<window.App />} />
            <Route path="/staff" element={<window.StaffLogin />} />
            <Route path="/staff/dashboard" element={<window.StaffDashboard />} />
            <Route path="/staff/manage" element={<window.ManageStaff />} />
            <Route path="/staff/reports" element={<window.ReportsManagement />} />
            <Route path="/staff/banned-ips" element={<window.BannedIPsManagement />} />
            <Route path="/privacy-policy" element={<window.PrivacyPolicy />} />
            <Route path="/terms" element={<window.TermsAndConditions />} />
          </Routes>
        </BrowserRouter>
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app
initializeApp();

// Safety: hide splash after a longer delay in case app never signals
setTimeout(hideInitialSplash, 10000); // Increased to 10 seconds as fallback

// Only register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful');
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

// Unregister any existing service workers in development
if (import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Export for app code to call when first data is ready
export { hideInitialSplash, waitForSplashHide };