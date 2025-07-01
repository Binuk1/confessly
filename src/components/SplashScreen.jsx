import React from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img src="/logo.png" alt="Confessly Logo" className="splash-logo" />
        <h1 className="splash-title">Confessly</h1>
        <div className="splash-spinner"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
