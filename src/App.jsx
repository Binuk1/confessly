import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';
import AdminPanel from './components/AdminPanel';
import AdminAuth from './components/AdminAuth';
import SettingsModal from './components/SettingsModal';
import './App.css';

function MainAppContent({ darkMode, setDarkMode }) {
  const [viewTrending, setViewTrending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
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
    </>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

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
            />
          } />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;