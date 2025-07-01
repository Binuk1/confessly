import React from 'react';
import './Navbar.css';

export default function Navbar({ onProfile, onSettings, user }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src="/logo.png" alt="Confessly Logo" className="navbar-logo" />
        <span className="navbar-title">Confessly</span>
      </div>
      <div className="navbar-right">
        <button className="navbar-btn profile-btn" onClick={onProfile} title="Profile">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="navbar-avatar-img"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #6366f1'
              }}
            />
          ) : (
            <span className="navbar-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
          )}
        </button>
        <button className="navbar-btn settings-btn" onClick={onSettings} title="Settings">
          <span className="navbar-cog">⚙️</span>
        </button>
      </div>
    </nav>
  );
}
