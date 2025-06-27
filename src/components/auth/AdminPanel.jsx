// AdminPanel.jsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import './AdminPanel.css';

const AdminPanel = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleMakeAdmin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      // Find user by email
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setMessage('User not found.');
      } else {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
        setMessage('User promoted to admin!');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  // New: Search users by username
  const handleSearch = async (e) => {
    e.preventDefault();
    setUsers([]);
    if (!search) return;
    const q = query(collection(db, 'users'), where('username', '>=', search), where('username', '<=', search + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  return (
    <div className="admin-panel redesigned-admin-panel">
      <h2 className="admin-panel-title">Admin Panel</h2>
      <form onSubmit={handleMakeAdmin} className="admin-promote-form">
        <input
          type="email"
          placeholder="Promote by email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>Promote to Admin</button>
      </form>
      <form onSubmit={handleSearch} className="admin-search-form">
        <input
          type="text"
          placeholder="Search users by username"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-users-list">
        {users.map(user => (
          <div key={user.id} className="admin-user-item" onClick={() => setSelectedUser(user)}>
            <span>{user.username || user.email}</span>
            <span className="admin-user-role">{user.role || 'user'}</span>
          </div>
        ))}
      </div>
      {selectedUser && (
        <div className="admin-user-modal" onClick={() => setSelectedUser(null)}>
          <div className="admin-user-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedUser(null)}>&times;</button>
            <h3>User Info</h3>
            <div><b>Username:</b> {selectedUser.username}</div>
            <div><b>Email:</b> {selectedUser.email}</div>
            <div><b>Role:</b> {selectedUser.role || 'user'}</div>
            <div><b>User ID:</b> {selectedUser.id}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
