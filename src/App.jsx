import { useState, useEffect } from 'react';
import { MdFiberNew } from 'react-icons/md';
import { BsFire } from 'react-icons/bs';
import { IoMdSettings } from 'react-icons/io';
import { FaCog } from 'react-icons/fa';
import adImage1 from './assets/ad-1.png';
import adImage2 from './assets/ad-2.png';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import { hideInitialSplash } from './main';
import TrendingConfessions from './components/TrendingConfessions';
import SettingsModal from './components/SettingsModal';
import GoToTop from './components/GoToTop';
import ConnectionStatus from './components/ConnectionStatus';
import './utils/consoleWarning';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [viewTrending, setViewTrending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }

    // Hide the initial splash screen
    hideInitialSplash();

    // Console warning is auto-initialized via import
  }, [darkMode]);

  // Hide inline splash as soon as app mounts
  useEffect(() => {
    hideInitialSplash();
  }, []);

  const handleSwitchView = (toTrending) => {
    if (viewTrending === toTrending) return;
    // Preserve current scroll position to avoid flicker/jump on first toggle
    const y = window.scrollY;
    setViewTrending(toTrending);
    // Restore scroll on next frame after DOM updates
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
  };

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
                className="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Settings"
                title="Settings"
              >
                <FaCog size={20} />
              </button>
            </header>

            {showSettings && (
              <SettingsModal 
                darkMode={darkMode}
                onToggleDarkMode={(next) => {
                  setDarkMode(next);
                  localStorage.setItem('darkMode', String(next));
                }}
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
