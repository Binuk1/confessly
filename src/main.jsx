import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import StaffLogin from './components/staff/StaffLogin.jsx'; // new
import StaffDashboard from "./components/staff/StaffDashboard.jsx";
import ManageStaff from "./components/staff/ManageStaff.jsx";
import ReportsManagement from './components/staff/ReportsManagement';
import BannedIPsManagement from './components/staff/BannedIPsManagement';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/staff" element={<StaffLogin />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/manage" element={<ManageStaff />} />
        <Route path="/staff/reports" element={<ReportsManagement />} />
        <Route path="/staff/banned-ips" element={<BannedIPsManagement />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

// Safety: hide splash after a longer delay in case app never signals
setTimeout(hideInitialSplash, 10000); // Increased to 10 seconds as fallback

// Export for app code to call when first data is ready
export { hideInitialSplash, waitForSplashHide };