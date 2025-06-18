import { useState, useEffect } from 'react';
import { FaCog, FaMoon, FaSun } from 'react-icons/fa';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';
import './App.css';

function App() {
  const [viewTrending, setViewTrending] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load theme preference from localStorage on initial component mount
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
  }, []);

  // Apply theme class to body and save preference to localStorage whenever darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  return (
    <div className="App">
      <header className="app-header">
        <h1>Anonymous Confession Wall</h1>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <FaCog />
        </button>
      </header>

      {showSettings && (
        <div className="settings-modal">
          <div className="settings-content">
            <h3>Settings</h3>
            <div className="theme-switch">
              <button
                onClick={() => setDarkMode(false)}
                className={!darkMode ? 'active' : ''}
              >
                <FaSun /> Light Mode
              </button>
              <button
                onClick={() => setDarkMode(true)}
                className={darkMode ? 'active' : ''}
              >
                <FaMoon /> Dark Mode
              </button>
            </div>
            <button 
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ConfessionForm />
      
      <div className="toggle-bar">
        <button
          className={!viewTrending ? 'active' : ''}
          onClick={() => setViewTrending(false)}
        >
          🆕 Latest
        </button>
        <button
          className={viewTrending ? 'active' : ''}
          onClick={() => setViewTrending(true)}
        >
          🔥 Trending
        </button>
      </div>

      {viewTrending ? <TrendingConfessions /> : <ConfessionList />}
    </div>
  );
}

export default App;