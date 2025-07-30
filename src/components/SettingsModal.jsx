import { FaSun, FaMoon, FaStar } from 'react-icons/fa';
import './SettingsModal.css';

function SettingsModal({ darkMode, setDarkMode, onClose }) {
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
      </div>
    </div>
  );
}

export default SettingsModal;