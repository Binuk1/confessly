// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiWechatFill } from 'react-icons/ri';
import { FaCog, FaUser, FaUserFriends } from 'react-icons/fa';
import Friends from './friends/Friends';
import ChatSystem from './chatsystem/ChatSystem';
import '../registerSW';

const Dashboard = ({ user, role, username, onLogout, friends, setFriendsList }) => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="main-layout" style={{ display: 'flex', height: '100vh' }}>
      <div className="sidebar" style={{ width: 280, minWidth: 280, maxWidth: 280, height: '100vh' }}>
        <Friends
          currentUser={user}
          username={username}
          onLogout={onLogout}
          showAdminButton={role === 'admin'}
          setFriendsList={setFriendsList}
          hideActionsOnMobile={isMobile}
        />
      </div>
      {/* You can add more dashboard content here if needed */}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? 80 : 32, // Add extra space above mobile navbar
        right: 32,
        zIndex: 4001,
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => navigate('/chat')}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 80%, #fbbf24 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 64,
            height: 64,
            fontSize: 0,
            boxShadow: '0 2px 12px rgba(99,102,241,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            pointerEvents: 'auto',
          }}
          aria-label="Open full chat page"
        >
          <RiWechatFill size={36} color="#fff" style={{display:'block'}} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
