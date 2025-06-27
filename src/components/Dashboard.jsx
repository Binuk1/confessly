// Dashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiWechatFill } from 'react-icons/ri';
import Friends from './friends/Friends';
import ChatSystem from './chatsystem/ChatSystem';
import '../registerSW';

const Dashboard = ({ user, role, username, onLogout, friends, setFriendsList }) => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div style={{position:'relative',width:'100%',minHeight:'100vh',background:'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 60%, #fbbf24 100%)', overflowX:'hidden', display:'flex'}}>
      <div style={{flex:'0 0 340px',maxWidth:340,minWidth:260,background:'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',borderTopRightRadius:24,borderBottomRightRadius:24,boxShadow:'2px 0 16px rgba(99,102,241,0.10)',zIndex:2,display:'flex',flexDirection:'column',padding:'0 0 0 0'}}>
        <Friends
          currentUser={user}
          username={username}
          onLogout={onLogout}
          showAdminButton={role === 'admin'}
          setFriendsList={setFriendsList}
        />
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:'100vh',background:'linear-gradient(135deg, #fff 0%, #f3f4f6 100%, #fbbf24 200%)',position:'relative'}}>
        {/* Floating chat button: always visible, modern, and accessible */}
        <div style={{
          position: 'fixed',
          bottom: 32,
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
        <ChatSystem currentUser={user} friends={friends} />
      </div>
    </div>
  );
};

export default Dashboard;
