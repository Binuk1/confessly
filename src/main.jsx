import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Function to load all components with proper error handling
async function loadComponents() {
  try {
    const [
      AppImport,
      StaffLoginImport,
      StaffDashboardImport,
      ManageStaffImport,
      ReportsManagementImport,
      BannedIPsManagementImport,
      PrivacyPolicyImport,
      TermsAndConditionsImport
    ] = await Promise.all([
      import('./App.jsx'),
      import('./components/staff/StaffLogin.jsx'),
      import('./components/staff/StaffDashboard.jsx'),
      import('./components/staff/ManageStaff.jsx'),
      import('./components/staff/ReportsManagement.jsx'),
      import('./components/staff/BannedIPsManagement.jsx'),
      import('./pages/PrivacyPolicy.jsx'),
      import('./pages/TermsAndConditions.jsx')
    ]);

    // Assign components to window object
    window.App = AppImport.default;
    window.StaffLogin = StaffLoginImport.default;
    window.StaffDashboard = StaffDashboardImport.default;
    window.ManageStaff = ManageStaffImport.default;
    window.ReportsManagement = ReportsManagementImport.default;
    window.BannedIPsManagement = BannedIPsManagementImport.default;
    window.PrivacyPolicy = PrivacyPolicyImport.default;
    window.TermsAndConditions = TermsAndConditionsImport.default;

  } catch (error) {
    console.error('Error loading components:', error);
    throw error; // Re-throw to be caught by initializeApp
  }
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
    
    // All components should be loaded now
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
    // Show error UI to user
    const root = document.getElementById('root');
    root.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; color: #ff4d4f;">
        <h2>Failed to load the application</h2>
        <p>Please refresh the page or try again later.</p>
        <p>Error: ${error.message}</p>
      </div>
    `;
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