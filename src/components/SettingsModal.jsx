import { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaEye, FaEyeSlash } from 'react-icons/fa';

function SettingsModal({ darkMode, setDarkMode, onClose }) {
  const [nsfwBlur, setNsfwBlur] = useState(
    localStorage.getItem('nsfwBlur') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('nsfwBlur', nsfwBlur);
  }, [nsfwBlur]);

  return (
    <div className="settings-modal">
      <div className="settings-content">
        <h3>Settings</h3>

        {/* Theme Toggle */}
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

        {/* NSFW Toggle */}
        <div className="theme-switch">
          <button
            onClick={() => setNsfwBlur(true)}
            className={nsfwBlur ? 'active' : ''}
          >
            <FaEyeSlash /> Blur NSFW
          </button>
          <button
            onClick={() => setNsfwBlur(false)}
            className={!nsfwBlur ? 'active' : ''}
          >
            <FaEye /> Show All
          </button>
        </div>

        <button 
          className="close-settings"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default SettingsModal;
