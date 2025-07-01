import React from 'react';
import './FriendsGrid.css';

export default function FriendsGrid({ friends = [] }) {
  return (
    <div className="friends-grid">
      {friends.length === 0 ? (
        <div className="no-friends">No friends yet.</div>
      ) : (
        friends.map(friend => (
          <div className="friend-card" key={friend.id}>
            <div className="friend-avatar">
              {friend.photoURL ? (
                <img 
                  src={friend.photoURL} 
                  alt={friend.username || 'Friend'} 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback to initial if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span style={{ 
                display: friend.photoURL ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#fff'
              }}>
                {friend.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="friend-name">{friend.username}</div>
          </div>
        ))
      )}
    </div>
  );
}
