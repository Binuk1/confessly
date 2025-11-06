// components/BanPage.jsx - UPDATED DESIGN
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import './BanPage.css';

function BanPage({ banInfo, onRetry }) {

  // If no ban info is provided, try to get it from session storage
  const effectiveBanInfo = banInfo || (() => {
    const savedBanInfo = sessionStorage.getItem('banInfo');
    return savedBanInfo ? JSON.parse(savedBanInfo) : null;
  })();

  // If still no ban info, show loading state
  if (!effectiveBanInfo) {
    return null; // Splash screen will handle the loading state
  }

  const formatExpiryDate = (expiresAt) => {
    if (!expiresAt) {
      return 'This is a permanent ban';
    }
    
    try {
      const date = new Date(expiresAt);
      if (isNaN(date.getTime())) {
        return 'This ban has no expiration date';
      }
      
      // Check if ban has expired
      if (new Date() > date) {
        // Clear ban info if expired
        sessionStorage.removeItem('banInfo');
        if (onRetry) {
          onRetry();
        } else {
          window.location.reload();
        }
        return 'Ban expired. Refreshing...';
      }
      
      return `This ban expires on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } catch (error) {
      return 'This ban has no expiration date';
    }
  };

  const handleRetry = () => {
    // Clear session storage and notify parent to recheck ban status
    sessionStorage.removeItem('banInfo');
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };


  return (
    <div className="ban-page">
      <div className="ban-container">
        <div className="ban-icon">🚫</div>
        <h1 className="ban-title">Access Restricted</h1>
        
        <div className="ban-details">
          <p className="ban-description">
            Your access to Confessly has been temporarily restricted.
          </p>
          
          <div className="ban-reason">
            <strong>Reason</strong>
            <p className="ban-message">
              {effectiveBanInfo.reason || 'Your access has been restricted due to a violation of our community guidelines.'}
            </p>
            
            <p className="ban-expiry">
              {effectiveBanInfo.expiresAt ? formatExpiryDate(effectiveBanInfo.expiresAt) : 'This is a permanent ban.'}
            </p>
            {effectiveBanInfo.ip && (
              <div className="ban-ip">
                IP: {effectiveBanInfo.ip}
              </div>
            )}
          </div>
        </div>

        <div className="ban-actions">
          <button 
            className="ban-btn ban-btn-retry"
            onClick={handleRetry}
          >
            ↻ Check Again
          </button>
        </div>
      </div>
      <div className="ban-footer">
        <p>If you believe this is a mistake, the ban will be automatically lifted after the specified period.</p>
      </div>
    </div>
  );
}

export default BanPage;