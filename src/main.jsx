import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Lazy load all components
const App = lazy(() => import('./App.jsx'));
const StaffLogin = lazy(() => import('./components/staff/StaffLogin.jsx'));
const StaffDashboard = lazy(() => import('./components/staff/StaffDashboard.jsx'));
const ManageStaff = lazy(() => import('./components/staff/ManageStaff.jsx'));
const ReportsManagement = lazy(() => import('./components/staff/ReportsManagement.jsx'));
const BannedIPsManagement = lazy(() => import('./components/staff/BannedIPsManagement.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions.jsx'));

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
if (typeof window !== 'undefined') {
  const path = window.location.pathname;
  if (path === '/privacy-policy' || path === '/terms') {
    hideInitialSplash();
  }
}

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: '#ff4d4f' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#0b0b0b',
    color: 'white',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

// Main App component
function AppWrapper() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
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
      </Suspense>
    </ErrorBoundary>
  );
}

// Initialize the app
function initializeApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </StrictMode>
  );
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