import { FaSun, FaMoon } from 'react-icons/fa';

function SettingsModal({ darkMode, setDarkMode, onClose }) {
  return (
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
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default SettingsModal;