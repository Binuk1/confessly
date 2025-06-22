import { useState, useEffect } from 'react';
import { FaCog } from 'react-icons/fa';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';
import SettingsModal from './components/SettingsModal';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [viewTrending, setViewTrending] = useState(false);
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
