import React, { useState } from 'react';
import './SettingsModal.css';

export default function SettingsModal({ onLogout, onDeleteAccount, onClose }) {
  const [dark, setDark] = useState(document.body.classList.contains('dark'));
  const toggleTheme = () => {
    setDark(d => {
      document.body.classList.toggle('dark', !d);
      return !d;
    });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>&times;</button>
        <h2>Settings</h2>
        <div className="theme-toggle-row">
          <span>Theme:</span>
          <button className={`theme-toggle-btn${dark ? ' dark' : ''}`} onClick={toggleTheme} aria-label="Toggle dark mode">
            <span className="sun-moon">
              <span className="sun" />
              <span className="moon" />
              <span className="stars" />
            </span>
          </button>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <button className="delete-account-btn" onClick={onDeleteAccount}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}
