import { FaSun, FaMoon, FaStar } from 'react-icons/fa';
import React, { useState, useEffect } from 'react';
import { RiInformationLine } from 'react-icons/ri';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, darkMode, onToggleDarkMode }) => {
  const [nsfwFilter, setNsfwFilter] = useState(true); // Default to enabled
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(max-width: 768px)').matches;
    }
    return false;
  });

  // Load NSFW filter setting from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('nsfwFilter');
    if (savedFilter !== null) {
      setNsfwFilter(JSON.parse(savedFilter));
    }
  }, []);

  // Determine if viewport is mobile for tooltip rendering
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);

  // Save NSFW filter setting to localStorage when it changes
  const handleNsfwToggle = () => {
    const newValue = !nsfwFilter;
    setNsfwFilter(newValue);
    localStorage.setItem('nsfwFilter', JSON.stringify(newValue));
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('nsfwToggle', {
      detail: { nsfwFilter: newValue }
    }));
  };

  // Close modal if click is outside the content
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('settings-modal')) {
      onClose();
    }
  };

  return (
    <div className="settings-modal" onClick={handleOverlayClick}>
      <div className="settings-content">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-settings" onClick={onClose}>
            Close
          </button>
        </div>
        
        <div className="theme-section">
          <h4>Theme</h4>
          <div className="theme-toggle-container">
            <div className="theme-toggle" onClick={() => onToggleDarkMode(!darkMode)}>
              <div className={`toggle-background ${darkMode ? 'dark' : 'light'}`}>
                <div className="stars">
                  <FaStar className="star star-1" />
                  <FaStar className="star star-2" />
                  <FaStar className="star star-3" />
                </div>
                <div className={`toggle-slider ${darkMode ? 'dark' : 'light'}`}>
                  {darkMode ? <FaMoon /> : <FaSun />}
                </div>
              </div>
            </div>
            <span className="theme-label">
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>
        
        <div className="nsfw-section">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-header">
                <h3>NSFW Content Filter</h3>
                <div 
                  className="info-icon-container"
                  onMouseEnter={() => !isMobile && setShowTooltip(true)}
                  onMouseLeave={() => !isMobile && setShowTooltip(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip((v) => !v);
                  }}
                >
                  <RiInformationLine className="info-icon" />
                  {showTooltip && (
                    isMobile ? (
                      <div className="tooltip-backdrop" role="dialog" aria-modal="true" onClick={() => setShowTooltip(false)}>
                        <div className="tooltip-mobile" onClick={(e) => e.stopPropagation()}>
                          <div className="tooltip-content">
                            <h4>🛡️ AI-Powered Content Moderation</h4>
                            <p>Content is automatically flagged by our advanced AI system and reviewed by the Confessly security team to ensure a safe community experience.</p>
                            <div className="tooltip-features">
                              <span>✓ Real-time AI detection</span>
                              <span>✓ Human oversight</span>
                              <span>✓ Privacy-focused</span>
                            </div>
                            <div className="tooltip-disclaimer">
                              <small>⚠️ AI systems may occasionally make mistakes</small>
                            </div>
                            <button className="tooltip-close" onClick={() => setShowTooltip(false)} aria-label="Close">Close</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="tooltip">
                        <div className="tooltip-content">
                          <h4>🛡️ AI-Powered Content Moderation</h4>
                          <p>Content is automatically flagged by our advanced AI system and reviewed by the Confessly security team to ensure a safe community experience.</p>
                          <div className="tooltip-features">
                            <span>✓ Real-time AI detection</span>
                            <span>✓ Human oversight</span>
                            <span>✓ Privacy-focused</span>
                          </div>
                          <div className="tooltip-disclaimer">
                            <small>⚠️ AI systems may occasionally make mistakes</small>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
              <p>When enabled, any content flagged by our moderation system will be blurred.</p>
            </div>
            <div className="nsfw-toggle-container">
              <div className="nsfw-toggle" onClick={handleNsfwToggle}>
                <div className={`toggle-background ${nsfwFilter ? 'on' : 'off'}`}>
                  <div className={`toggle-slider ${nsfwFilter ? 'on' : 'off'}`}>
                    {nsfwFilter ? '🔒' : '🔓'}
                  </div>
                </div>
              </div>
              <span className="nsfw-label">
                {nsfwFilter ? 'NSFW Filter ON' : 'NSFW Filter OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;