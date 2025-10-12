// components/BanPage.jsx - UPDATED DESIGN
import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import './BanPage.css';

function BanPage() {
  const [banInfo, setBanInfo] = useState(null);

  useEffect(() => {
    // Get fresh ban info when ban page loads
    checkBanStatus();
  }, []);

  const checkBanStatus = async () => {
    try {
      const checkSiteBan = httpsCallable(functions, 'checkSiteBan');
      const result = await checkSiteBan();
      setBanInfo(result.data);
    } catch (error) {
      console.error('Error checking ban status:', error);
      // If we can't get ban info, show generic message
      setBanInfo({
        isBanned: true,
        reason: 'Violation of community guidelines',
        expiresAt: null
      });
    }
  };

  const formatExpiryDate = (expiresAt) => {
    if (!expiresAt) {
      return 'This is a permanent ban';
    }
    
    try {
      const date = new Date(expiresAt);
      if (isNaN(date.getTime())) {
        return 'This ban has no expiration date';
      }
      return `This ban expires on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } catch (error) {
      return 'This ban has no expiration date';
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (!banInfo) {
    return (
      <div className="ban-page">
        <div className="ban-container">
          <div className="ban-loading">
            <div className="loading-spinner"></div>
            <p>Checking your access status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ban-page">
      <div className="ban-container">
        <div className="ban-icon">🚫</div>
        <h1 className="ban-title">Access Restricted</h1>
        
        <div className="ban-details">
          <p className="ban-message">
            Your access to Confessly has been temporarily restricted.
          </p>
          
          <div className="ban-reason">
            <strong>Reason</strong>
            <div className="ban-reason-content">
              {banInfo.reason || 'Violation of community guidelines'}
            </div>
          </div>
          
          <div className="ban-expiry">
            {formatExpiryDate(banInfo.expiresAt)}
          </div>
          
          {banInfo.ip && (
            <div className="ban-ip">
              IP: {banInfo.ip}
            </div>
          )}
        </div>

        <div className="ban-actions">
          <button 
            className="ban-btn ban-btn-retry"
            onClick={handleRetry}
          >
            ↻ Check Again
          </button>
        </div>

        <div className="ban-footer">
          <p>If you believe this is a mistake, the ban will be automatically lifted after the specified period.</p>
        </div>
      </div>
    </div>
  );
}

export default BanPage;