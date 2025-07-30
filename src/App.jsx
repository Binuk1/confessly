import { useState, useEffect } from 'react';
import { FaCog } from 'react-icons/fa';
import ConfessionForm from './components/ConfessionForm';
import ConfessionList from './components/ConfessionList';
import TrendingConfessions from './components/TrendingConfessions';
import SettingsModal from './components/SettingsModal';
import './App.css';
import logo from './assets/android-chrome-192x192.png';

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
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <>
      <header className="confession-wall-header" dir="ltr" style={{
        background: 'linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 2rem 1.2rem 2rem',
        borderRadius: '0 0 1.5rem 1.5rem',
        boxShadow: '0 2px 12px 0 rgba(80,80,120,0.08)',
        marginBottom: 0,
        fontWeight: 600,
        fontSize: '1.7rem',
        letterSpacing: '0.01em',
      }}>
        <span className="confession-wall-title" style={{fontWeight:700, fontSize:'1.5em', letterSpacing:'0.01em'}}>Anonymous Confession Wall</span>
        <button 
          className={`settings-button${showSettings ? ' open' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
          style={{
            background: 'none',
            border: 'none',
            borderRadius: 0,
            padding: 0,
            cursor: 'pointer',
            color: '#fff',
            marginLeft: '1.2em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            lineHeight: 0,
            transition: 'transform 3s cubic-bezier(.4,2,.6,1)',
            transform: showSettings ? 'rotate(360deg)' : 'rotate(0deg)',
            willChange: 'transform',
            verticalAlign: 'middle',
          }}>
            <FaCog size={24} style={{ display: 'block', margin: 0, padding: 0 }} />
          </span>
        </button>
      </header>
      {showSettings && (
        <SettingsModal 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="confession-wall-container">
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
    </>
  );
}

export default App;