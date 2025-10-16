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
import './utils/consoleWarning';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [viewTrending, setViewTrending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBanned, setIsBanned] = useState(null); // null = checking, false = not banned, true = banned
  const [splashHidden, setSplashHidden] = useState(false);

  const toggleDarkMode = (isDark) => {
    setDarkMode(isDark);
    localStorage.setItem('darkMode', isDark);
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    toggleDarkMode(savedMode);

    // Start ban check and ONLY hide splash when it's complete
    const initializeApp = async () => {
      await checkBanStatus();
      
      // Now hide the splash screen
      hideInitialSplash();
      setSplashHidden(true);
    };

    initializeApp();
  }, []);

  const checkBanStatus = async () => {
    try {
      const checkSiteBan = httpsCallable(functions, 'checkSiteBan');
      const result = await checkSiteBan();
      setIsBanned(result.data.isBanned);
    } catch (error) {
      console.error('Error checking ban status:', error);
      setIsBanned(false); // Allow access if check fails
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

  // Show ban page if banned (only after splash is hidden)
  if (isBanned === true && splashHidden) {
    return <BanPage />;
  }

  // Don't show main app until splash is hidden and ban check is complete
  if (!splashHidden || isBanned === null) {
    return null; // Splash screen stays visible
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
    </div>
  );
}

export default App;