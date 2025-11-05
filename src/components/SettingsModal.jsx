import { FaSun, FaMoon, FaStar } from 'react-icons/fa';
import React, { useState, useEffect } from 'react';
import { RiInformationLine } from 'react-icons/ri';
import { createPortal } from 'react-dom';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, darkMode, onToggleDarkMode }) => {
  const [nsfwFilter, setNsfwFilter] = useState(true); // Default to enabled
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = 'nsfw-tooltip';
  // Determine mobile at render time to avoid tooltip flicker
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 600px)').matches;

  // Load NSFW filter setting from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('nsfwFilter');
    if (savedFilter !== null) {
      setNsfwFilter(JSON.parse(savedFilter));
    }
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

  // Accessibility: keyboard support for tooltip toggle
  const handleTooltipKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowTooltip(prev => !prev);
    } else if (e.key === 'Escape') {
      setShowTooltip(false);
    }
  };

  // Close modal if click is outside the content
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('settings-modal')) {
      if (!isOpen) return null;
      onClose();
    }
  };

  return createPortal((
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
            <div
              className="theme-toggle"
              onClick={() => {
                if (typeof onToggleDarkMode === 'function') {
                  onToggleDarkMode(!darkMode);
                } else {
                  console.warn('onToggleDarkMode is not provided');
                }
              }}
            >
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
          <h4 className="section-title">
            NSFW Content Filter
            <span 
              className="info-icon-container"
              role="button"
              tabIndex={0}
              aria-label="About NSFW content filter"
              aria-haspopup="dialog"
              aria-expanded={showTooltip}
              aria-controls={tooltipId}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              onKeyDown={handleTooltipKeyDown}
            >
              <RiInformationLine className="info-icon" />
              {showTooltip && (
                <div className={`tooltip ${isMobile ? 'mobile' : ''}`} role="tooltip" id={tooltipId}>
                  <div className="tooltip-content">
                    <h4>🔍 Content Moderation</h4>
                    <p>AI + human review for safety.</p>
                  </div>
                </div>
              )}
            </span>
          </h4>
          <p className="nsfw-description">When enabled, any content flagged by our moderation system will be blurred.</p>
          <div className="nsfw-toggle-row">
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
        
        <div className="legal-links">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <span className="divider">•</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms & Conditions
          </a>
        </div>
      </div>
    </div>
  ), document.getElementById('modal-root'));
}

export default SettingsModal;