import React, { useState } from 'react';
import './DeleteAccountModal.css';

export default function DeleteAccountModal({ user, onClose, onDelete }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const handleDelete = () => {
    if (input !== user?.username) {
      setError('Username does not match.');
      return;
    }
    onDelete();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>&times;</button>
        <h2>Confirm Account Deletion</h2>
        <p>Type your username to confirm:</p>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Username" />
        {error && <div className="error-msg">{error}</div>}
        <button className="confirm-delete-btn" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}
