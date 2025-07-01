import React from 'react';
import './ProfileModal.css';

export default function ProfileModal({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>&times;</button>
        <h2>Account Info</h2>
        <div className="profile-info">
          <div><b>Username:</b> {user?.username}</div>
          <div><b>Email:</b> {user?.email}</div>
        </div>
      </div>
    </div>
  );
}
