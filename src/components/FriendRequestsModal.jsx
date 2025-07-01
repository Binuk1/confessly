import React from 'react';
import './FriendRequestsModal.css';

export default function FriendRequestsModal({ onClose }) {
  // Placeholder: Replace with real data/logic
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content friend-requests-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>&times;</button>
        <h2>Friend Requests</h2>
        <div className="requests-section">
          <h3>Incoming</h3>
          <div className="request-list">No incoming requests.</div>
          <h3>Outgoing</h3>
          <div className="request-list">No outgoing requests.</div>
        </div>
      </div>
    </div>
  );
}
