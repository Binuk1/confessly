import { useState, useEffect } from 'react';
import { FaCog, FaMoon, FaSun } from 'react-icons/fa';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';
import AdminPanel from './components/AdminPanel';
import './App.css';

function MainAppContent({ darkMode, setDarkMode, showSettings, setShowSettings }) {
  const [viewTrending, setViewTrending] = useState(false);

  return (
    <>
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
    </>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <MainAppContent 
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              showSettings={showSettings}
              setShowSettings={setShowSettings}
            />
          } />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;