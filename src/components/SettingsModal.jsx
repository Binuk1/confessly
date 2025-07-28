
import { FaSun, FaMoon } from 'react-icons/fa';
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
      <div className="settings-content" style={{ direction: 'ltr' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '2.1rem', fontWeight: 800, letterSpacing: '0.5px', textAlign: 'left' }}>Settings</h3>
          </div>
          <button 
            className="close-settings red-close"
            onClick={onClose}
            style={{ marginLeft: '1rem', marginTop: 0 }}
          >
            Close
          </button>
        </div>
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
      </div>
    </div>
  );
}

export default SettingsModal;