import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/CookieConsent.css';

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === null) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="cookie-consent-overlay">
      <div className="cookie-consent">
        <div className="cookie-content">
          <h3>We respect your privacy</h3>
          {showDetails ? (
            <div className="details-content">
              <p>
                Our platform doesn’t use tracking cookies or collect personal data.
                We only use small pieces of browser storage (localStorage) to remember basic settings
                — such as your cookie consent and display preferences.
              </p>
              <p>
                For more details about how we handle technical data and IP-based moderation, check our:
              </p>
              <ul>
                <li>
                  <Link to="/privacy-policy" onClick={(e) => e.stopPropagation()}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" onClick={(e) => e.stopPropagation()}>
                    Terms & Conditions
                  </Link>
                </li>
              </ul>
            </div>
          ) : (
            <p>
              We don’t use tracking cookies. We only store small settings (like your consent)
              to improve how the app works for you. Click “Learn More” to read details.
            </p>
          )}
          <div className="cookie-buttons">
            <button className="cookie-btn accept-btn" onClick={handleAccept}>
              Got It
            </button>
            <button
              className={`cookie-btn ${showDetails ? 'back-btn' : 'learn-more-btn'}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
            >
              {showDetails ? 'Back' : 'Learn More'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
