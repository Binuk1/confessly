import React from 'react';
import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-bg" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',width:'100vw',position:'fixed',top:0,left:0}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <img src="/src/assets/logo.png" alt="Confessly Logo" className="splash-logo" />
        <h1 className="splash-title">Confessly</h1>
      </div>
    </div>
  );
}
