import { useState, useEffect } from 'react';
import { MdWifiOff, MdWifi } from 'react-icons/md';
import './ConnectionStatus.css';

function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showModal, setShowModal] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let pingInterval;
    let reconnectTimeout;

    // Enhanced connection check with actual network test
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource with cache-busting
        const response = await fetch('/favicon.ico?' + Date.now(), {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        const actuallyOnline = response.ok;
        
        if (actuallyOnline !== isOnline) {
          setIsOnline(actuallyOnline);
          
          if (!actuallyOnline) {
            // Connection lost
            setShowModal(true);
            setWasOffline(true);
          } else if (wasOffline) {
            // Connection restored
            setShowModal(true);
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
              setShowModal(false);
              setWasOffline(false);
            }, 3000);
          }
        }
      } catch (error) {
        // Network error - definitely offline
        if (isOnline) {
          setIsOnline(false);
          setShowModal(true);
          setWasOffline(true);
        }
      }
    };

    // Browser online/offline events (basic detection)
    const handleOnline = () => {
      // Don't trust this immediately, verify with actual request
      setTimeout(checkConnection, 100);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowModal(true);
      setWasOffline(true);
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check (every 5 seconds when offline, 30 seconds when online)
    const startPinging = () => {
      const interval = isOnline ? 30000 : 5000;
      pingInterval = setInterval(checkConnection, interval);
    };

    startPinging();

    // Restart interval when connection status changes
    const restartPinging = () => {
      clearInterval(pingInterval);
      startPinging();
    };

    // Watch for connection status changes
    if (!isOnline) {
      restartPinging();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
    };
  }, [isOnline, wasOffline]);

  // Don't show modal if we've never been offline
  if (!showModal || (!wasOffline && isOnline)) {
    return null;
  }

  return (
    <div className="connection-modal-overlay">
      <div className={`connection-modal ${isOnline ? 'online' : 'offline'}`}>
        <div className="connection-icon">
          {isOnline ? (
            <MdWifi size={32} />
          ) : (
            <MdWifiOff size={32} />
          )}
        </div>
        
        <div className="connection-content">
          <h3 className="connection-title">
            {isOnline ? 'Connection Restored!' : 'No Internet Connection'}
          </h3>
          
          <p className="connection-message">
            {isOnline 
              ? 'You\'re back online. All features are now available.'
              : 'Please check your internet connection. We\'ll keep trying to reconnect...'
            }
          </p>
          
          {!isOnline && (
            <div className="connection-spinner">
              <div className="spinner"></div>
              <span>Reconnecting...</span>
            </div>
          )}
        </div>
        
        {isOnline && (
          <button 
            className="connection-close"
            onClick={() => {
              setShowModal(false);
              setWasOffline(false);
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
