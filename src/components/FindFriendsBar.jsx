import React from 'react';
import './FindFriendsBar.css';

export default function FindFriendsBar() {
  return (
    <div className="find-friends-bar">
      <input className="find-friends-input" placeholder="Find friends..." />
      <button className="find-friends-btn">Search</button>
    </div>
  );
}
