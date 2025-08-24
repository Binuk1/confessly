import { FaSun, FaMoon, FaStar } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import './SettingsModal.css';

function SettingsModal({ darkMode, setDarkMode, onClose }) {
  const [nsfwFilter, setNsfwFilter] = useState(true);

  // Load NSFW filter setting from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('nsfwFilter');
    if (savedFilter !== null) {
      setNsfwFilter(JSON.parse(savedFilter));
    }
  }, []);

  // Save NSFW filter setting to localStorage when it changes
  const handleNsfwToggle = () => {
    const newValue = !nsfwFilter;
    setNsfwFilter(newValue);
    localStorage.setItem('nsfwFilter', JSON.stringify(newValue));
  };
  // Close modal if click is outside the content
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('settings-modal')) {
      onClose();
    }
  };

  return (
    <div className="settings-modal" onClick={handleOverlayClick}>
      <div className="settings-content">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-settings" onClick={onClose}>
            Close
          </button>
        </div>
        
        <div className="theme-section">
          <h4>Theme</h4>
          <div className="theme-toggle-container">
            <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
              <div className={`toggle-background ${darkMode ? 'dark' : 'light'}`}>
                <div className="stars">
                  <FaStar className="star star-1" />
                  <FaStar className="star star-2" />
                  <FaStar className="star star-3" />
                </div>
                <div className={`toggle-slider ${darkMode ? 'dark' : 'light'}`}>
                  {darkMode ? <FaMoon /> : <FaSun />}
                </div>
              </div>
            </div>
            <span className="theme-label">
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>
        
        <div className="nsfw-section">
          <h4>Content Filter</h4>
          <div className="nsfw-toggle-container">
            <div className="nsfw-toggle" onClick={handleNsfwToggle}>
              <div className={`toggle-background ${nsfwFilter ? 'on' : 'off'}`}>
                <div className={`toggle-slider ${nsfwFilter ? 'on' : 'off'}`}>
                  {nsfwFilter ? '🔒' : '🔓'}
                </div>
              </div>
            </div>
            <span className="nsfw-label">
              {nsfwFilter ? 'NSFW Filter ON' : 'NSFW Filter OFF'}
            </span>
          </div>
          <p className="nsfw-description">
            When enabled, NSFW content will be blurred and require a click to view.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;