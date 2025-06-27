// Dashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Friends from './friends/Friends';

const Dashboard = ({ user, role, username, onLogout }) => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <Friends currentUser={user} username={username} onLogout={onLogout} showAdminButton={role === 'admin'} />
    </>
  );
};

export default Dashboard;
