import React from 'react';
import { useNavigate } from 'react-router-dom';
import './welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  return (
    <div className="welcome-bg">
      <div className="welcome-content">
        <img src="/logo.png" alt="Confessly Logo" className="welcome-logo" />
        <h1 className="welcome-title">Welcome to <span style={{color:'#6366f1'}}>Confessly</span></h1>
        <p className="welcome-desc">A modern, private Messenger-like chat app for real connections.<br/>Sign up or log in to start chatting with friends! </p>
        <h2 className="welcome-made">Made by ice codm :) 🎉</h2>
        <div className="welcome-actions">
          <button className="welcome-btn" onClick={()=>{navigate('/auth?mode=login'); window.scrollTo(0,0);}}>Login</button>
          <button className="welcome-btn" onClick={()=>{navigate('/auth?mode=signup'); window.scrollTo(0,0);}}>Sign Up</button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
