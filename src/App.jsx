import { useState, useEffect } from 'react';
import { FaCog } from 'react-icons/fa';
import { MdFiberNew } from 'react-icons/md';
import { BsFire } from 'react-icons/bs';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import { hideInitialSplash } from './main';
import TrendingConfessions from './components/TrendingConfessions';
import SettingsModal from './components/SettingsModal';
import GoToTop from './components/GoToTop';
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
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Hide inline splash as soon as app mounts
  useEffect(() => {
    hideInitialSplash();
  }, []);

  const handleSwitchView = (toTrending) => {
    if (viewTrending === toTrending) return;
    setViewTrending(toTrending);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Anonymous Confession Wall</h1>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <FaCog size={24} />
        </button>
      </header>

      {showSettings && (
        <SettingsModal 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
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
          <ConfessionList isActive={!viewTrending} />
        </div>
        <div className={`view-panel ${viewTrending ? 'active' : 'inactive'}`} aria-hidden={!viewTrending}>
          <TrendingConfessions isActive={viewTrending} />
        </div>
      </div>
      
      <GoToTop />
    </div>
  );
}

export default App;
