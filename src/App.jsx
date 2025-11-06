import { useState, useEffect } from 'react';
import { MdFiberNew } from 'react-icons/md';
import { BsFire } from 'react-icons/bs';
import { IoMdSettings } from 'react-icons/io';
import { FaCog } from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import adImage1 from './assets/ad-1.png';
import adImage2 from './assets/ad-2.png';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import { hideInitialSplash, waitForSplashHide } from './main';
import TrendingConfessions from './components/TrendingConfessions';
import SettingsModal from './components/SettingsModal';
import GoToTop from './components/GoToTop';
import ConnectionStatus from './components/ConnectionStatus';
import BanPage from './components/BanPage';
import CookieConsent from './components/CookieConsent';
import './utils/consoleWarning';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [viewTrending, setViewTrending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBanned, setIsBanned] = useState(null); // null = checking, false = not banned, true = banned
  const [banInfo, setBanInfo] = useState(null);
  const [splashHidden, setSplashHidden] = useState(false);

  const toggleDarkMode = (isDark) => {
    setDarkMode(isDark);
    localStorage.setItem('darkMode', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    toggleDarkMode(savedMode);
    
    // Check if we have a saved session
    const savedBanInfo = sessionStorage.getItem('banInfo');
    if (savedBanInfo) {
      const banData = JSON.parse(savedBanInfo);
      // If ban is expired, clear it
      if (banData.expiresAt && new Date() > new Date(banData.expiresAt)) {
        sessionStorage.removeItem('banInfo');
      } else {
        setBanInfo(banData);
        setIsBanned(true);
        setSplashHidden(true);
        return;
      }
    }
    
    // If no saved ban, check with server
    checkBanStatus().finally(() => {
      // Keep splash screen visible for at least 1.5s for better UX
      setTimeout(() => {
        hideInitialSplash();
        setSplashHidden(true);
      }, 1500);
    });
  }, []);

  const checkBanStatus = async () => {
    try {
      const checkSiteBan = httpsCallable(functions, 'checkSiteBan');
      // Add a small delay to ensure splash screen is visible
      const [result] = await Promise.all([
        checkSiteBan(),
        new Promise(resolve => setTimeout(resolve, 1000)) // Minimum 1s splash screen
      ]);
      setIsBanned(result.data.isBanned);
      setBanInfo(result.data);
      return result.data;
    } catch (error) {
      console.error('Error checking ban status:', error);
      setIsBanned(false); // Allow access if check fails
      return { isBanned: false };
    }
  };

  const handleSwitchView = (toTrending) => {
    if (viewTrending === toTrending) return;
    const y = window.scrollY;
    setViewTrending(toTrending);
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  };

  // Show ban page if banned
  if (isBanned === true) {
    return <BanPage 
      banInfo={banInfo} 
      onRetry={async () => {
        const result = await checkBanStatus();
        if (!result.isBanned) {
          setIsBanned(false);
          setBanInfo(null);
          sessionStorage.removeItem('banInfo');
        }
      }}
    />;
  }

  // Don't show main app until ban check is complete and splash is hidden
  if (isBanned === null || !splashHidden) {
    return null; // Splash screen will be shown by the splash screen component
  }

  // Main app content - only shown if not banned
  return (
    <div className="app-container">
      {/* Left Ad Container - Desktop Only */}
      <a 
        href="https://media.tenor.com/XcwA0JTGCcAAAAAe/why-are-you-gae-meme.png" 
        target="_blank" 
        rel="noopener noreferrer"
        className="ad-container ad-left"
      >
        <div className="ad-content">
          <img 
            src={adImage2} 
            alt="Advertisement" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </a>
      
      {/* Right Ad Container - Desktop Only */}
      <a 
        href="https://media.tenor.com/XcwA0JTGCcAAAAAe/why-are-you-gae-meme.png" 
        target="_blank" 
        rel="noopener noreferrer"
        className="ad-container ad-right"
      >
        <div className="ad-content">
          <img 
            src={adImage2} 
            alt="Advertisement" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </a>
      
      <div className="main-content-wrapper">
        {/* Main Content */}
        <div className="main-content">
          <div className="App">
            <header className="app-header">
              <h1>Confessly</h1>
              <button 
                className={`settings-button ${showSettings ? 'open' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Settings"
                title="Settings"
                aria-expanded={showSettings}
              >
                <FaCog size={20} />
              </button>
            </header>

            {showSettings && (
              <SettingsModal 
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                onClose={() => setShowSettings(false)}
              />
            )}

            <ConfessionForm />
            
            <div className="toggle-bar">
              <button
                className={!viewTrending ? 'active' : ''}
                onClick={() => handleSwitchView(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <MdFiberNew style={{ color: '#E53935', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.2))' }} size={24} />
                </span>
                <span>Latest</span>
              </button>
              <button
                className={viewTrending ? 'active' : ''}
                onClick={() => handleSwitchView(true)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <BsFire style={{ color: '#FFC94D', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.2))' }} size={22} />
                </span>
                <span>Trending</span>
              </button>
            </div>
            <div className="views-stack">
              <div className={`view-panel ${!viewTrending ? 'active' : 'inactive'}`} aria-hidden={viewTrending}>
                <ConfessionList isActive={!viewTrending} onOpenSettings={() => setShowSettings(true)} />
              </div>
              <div className={`view-panel ${viewTrending ? 'active' : 'inactive'}`} aria-hidden={!viewTrending}>
                <TrendingConfessions isActive={viewTrending} onOpenSettings={() => setShowSettings(true)} />
              </div>
            </div>
            
            <GoToTop />
            <ConnectionStatus />
          </div>
        </div>
      </div>
      <CookieConsent />
    </div>
  );
}

export default App;