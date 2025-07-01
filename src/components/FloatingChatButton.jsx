import React from 'react';
import './FloatingChatButton.css';

export default function FloatingChatButton() {
  return (
    <button className="floating-chat-btn" title="Open Chat" onClick={() => window.location.href='/chat'}>
      <span role="img" aria-label="Chat">💬</span>
    </button>
  );
}
