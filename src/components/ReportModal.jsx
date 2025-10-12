// ReportModal.jsx - UPDATED with IP fetching
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FaArrowLeft } from 'react-icons/fa';
import './ReportModal.css';

// Hook to hide go-to-top button and disable background scroll when modal is open
const useModalEffects = (isOpen) => {
  useEffect(() => {
    const goToTopBtn = document.querySelector('.go-to-top-button');
    if (goToTopBtn) {
      goToTopBtn.style.display = isOpen ? 'none' : '';
    }
    
    // Disable/enable background scrolling with proper scrollbar compensation
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      const appContainer = document.querySelector('.app-container');
      const appHeader = document.querySelector('.app-header');
      const adContainers = document.querySelectorAll('.ad-container');
      
      if (appContainer) {
        appContainer.style.paddingRight = `${scrollbarWidth}px`;
      }
      if (appHeader) {
        appHeader.style.paddingRight = `${scrollbarWidth}px`;
      }
      adContainers.forEach(ad => {
        ad.style.paddingRight = `${scrollbarWidth}px`;
      });
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      const appContainer = document.querySelector('.app-container');
      const appHeader = document.querySelector('.app-header');
      const adContainers = document.querySelectorAll('.ad-container');
      
      if (appContainer) {
        appContainer.style.paddingRight = '';
      }
      if (appHeader) {
        appHeader.style.paddingRight = '';
      }
      adContainers.forEach(ad => {
        ad.style.paddingRight = '';
      });
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      const appContainer = document.querySelector('.app-container');
      const appHeader = document.querySelector('.app-header');
      const adContainers = document.querySelectorAll('.ad-container');
      
      if (appContainer) {
        appContainer.style.paddingRight = '';
      }
      if (appHeader) {
        appHeader.style.paddingRight = '';
      }
      adContainers.forEach(ad => {
        ad.style.paddingRight = '';
      });
    };
  }, [isOpen]);
};

const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate content', emoji: '🚫' },
  { id: 'harassment', label: 'Harassment or bullying', emoji: '😡' },
  { id: 'sexual', label: 'Sexual or offensive material', emoji: '🔞' },
  { id: 'threat', label: 'Threat or self-harm', emoji: '⚠️' },
  { id: 'personal', label: 'Private or personal info shared', emoji: '🕵️' },
  { id: 'spam', label: 'Spam or fake confession', emoji: '🗑️' },
  { id: 'other', label: 'Other (please explain)', emoji: '❓' }
];

function ReportModal({
  isOpen,
  onClose,
  contentId,
  contentType, // 'confession' or 'reply'
  contentText,
  confessionId // NEW: Required for replies to fetch from subcollection
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOtherView, setShowOtherView] = useState(false);
  const textareaRef = useRef(null);
  
  useModalEffects(isOpen);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [otherReason]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSubmitted(false);
      setSelectedReason('');
      setOtherReason('');
      setShowOtherView(false);
    }, 300);
  };

  const handleReasonSelect = (reasonId) => {
    setSelectedReason(reasonId);
    if (reasonId === 'other') {
      setShowOtherView(true);
    } else {
      setShowOtherView(false);
      setOtherReason('');
    }
    if (errors.reason) {
      setErrors(prev => ({ ...prev, reason: null }));
    }
  };

  const handleBackFromOther = () => {
    setShowOtherView(false);
    setSelectedReason('');
    setOtherReason('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedReason) {
      newErrors.reason = 'Please select a reason for reporting';
    }
    
    if (selectedReason === 'other') {
      if (!otherReason.trim()) {
        newErrors.otherReason = 'Please provide details for your report';
      } else if (otherReason.trim().length < 10) {
        newErrors.otherReason = 'Please provide at least 10 characters of detail';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Fetch IP address from the original content document
   */
  const fetchContentIP = async () => {
    try {
      let contentRef;
      
      if (contentType === 'confession') {
        // Fetch from confessions collection
        contentRef = doc(db, 'confessions', contentId);
      } else if (contentType === 'reply') {
        // Fetch from replies subcollection
        if (!confessionId) {
          console.error('confessionId is required for reply reports');
          return null;
        }
        contentRef = doc(db, `confessions/${confessionId}/replies`, contentId);
      } else {
        console.error('Unknown content type:', contentType);
        return null;
      }

      const contentSnap = await getDoc(contentRef);
      
      if (contentSnap.exists()) {
        const contentData = contentSnap.data();
        return contentData.ipAddress || null;
      } else {
        console.warn('Content document not found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching content IP:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});
    
    try {
      // Fetch the IP address from the original content
      const ipAddress = await fetchContentIP();
      
      if (!ipAddress) {
        console.warn('No IP address found for this content. Report will still be created.');
      }

      // Create the report with IP address included
      await addDoc(collection(db, 'reports'), {
        contentId,
        contentType,
        contentText: contentText.substring(0, 200),
        reason: selectedReason,
        otherReason: selectedReason === 'other' ? otherReason.trim() : null,
        status: 'pending',
        priority: selectedReason === 'threat' ? 'high' : 'normal',
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        reportedFrom: window.location.pathname,
        // NEW: Store IP address and confessionId (for reply context)
        ipAddress: ipAddress || null,
        confessionId: contentType === 'reply' ? confessionId : contentId, // For replies, store parent confession ID
        parentId: contentType === 'reply' ? confessionId : null // Alternative field name for clarity
      });

      // Update the content's report count
      let contentRef;
      if (contentType === 'confession') {
        contentRef = doc(db, 'confessions', contentId);
      } else {
        contentRef = doc(db, `confessions/${confessionId}/replies`, contentId);
      }
      await updateDoc(contentRef, { reportCount: increment(1) });

      setSubmitted(true);
      setTimeout(handleClose, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setErrors({ submit: 'Failed to submit report. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal((
    <div className={`report-modal__backdrop ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="report-modal__container" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="report-modal__success">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Report Submitted Successfully</h3>
            <p className="success-message">
              Thank you for helping keep our community <span className="highlight">safe</span> and <span className="highlight">respectful</span>. 
              We'll review your report and take appropriate action.
            </p>
          </div>
        ) : (
          <>
            <header className="report-modal__header">
              <h2>Report Content</h2>
            </header>

            <main className="report-modal__body">
              <div className={`report-modal__content ${showOtherView ? 'show-other' : 'show-reasons'}`}>
                <div className="reasons-view">
                  <div className="report-modal__preview">
                    <p>"{contentText.substring(0, 100)}{contentText.length > 100 ? '...' : ''}"</p>
                  </div>

                  <form onSubmit={handleSubmit} className="report-modal__form">
                    <p className="report-modal__prompt">Why are you reporting this content?</p>
                    {errors.reason && <div className="error-message">{errors.reason}</div>}
                    
                    <div className="report-modal__reasons">
                      {REPORT_REASONS.map(reason => (
                        <label key={reason.id} className={`reason-card ${selectedReason === reason.id ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="reason"
                            value={reason.id}
                            checked={selectedReason === reason.id}
                            onChange={(e) => handleReasonSelect(e.target.value)}
                            disabled={submitting}
                          />
                          <span className="reason-card__emoji">{reason.emoji}</span>
                          <span className="reason-card__label">{reason.label}</span>
                        </label>
                      ))}
                    </div>

                    {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
                    
                    <footer className="report-modal__footer">
                      <button type="button" className="report-modal__btn--cancel" onClick={handleClose} disabled={submitting}>
                        Cancel
                      </button>
                      <button type="submit" className="report-modal__btn--submit" disabled={submitting || !selectedReason || selectedReason === 'other'}>
                        {submitting ? (
                          <>
                            <span className="spinner"></span>
                            Submitting...
                          </>
                        ) : 'Submit Report'}
                      </button>
                    </footer>
                  </form>
                </div>

                <div className="other-view">
                  <div className="other-header">
                    <h3>📝 Describe the Issue</h3>
                    <p>Please provide specific details about why this content violates our community guidelines.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="report-modal__form">
                    <div className="report-modal__other-reason">
                      <textarea
                        ref={textareaRef}
                        value={otherReason}
                        onChange={(e) => {
                          setOtherReason(e.target.value);
                          if (errors.otherReason) {
                            setErrors(prev => ({ ...prev, otherReason: null }));
                          }
                        }}
                        placeholder="Describe the specific issue with this content..."
                        maxLength={500}
                        disabled={submitting}
                        required
                        className={`auto-resize-textarea ${errors.otherReason ? 'error' : ''}`}
                      />
                      <div className="char-count">
                        <span className={otherReason.length > 450 ? 'warning' : ''}>
                          {otherReason.length}/500
                        </span>
                      </div>
                      {errors.otherReason && <div className="error-message">{errors.otherReason}</div>}
                    </div>

                    {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
                    
                    <footer className="report-modal__footer">
                      <button type="button" className="report-modal__btn--back" onClick={handleBackFromOther} disabled={submitting}>
                        <FaArrowLeft /> Go Back
                      </button>
                      <button type="submit" className="report-modal__btn--submit" disabled={submitting}>
                        {submitting ? (
                          <>
                            <span className="spinner"></span>
                            Submitting...
                          </>
                        ) : 'Submit Report'}
                      </button>
                    </footer>
                  </form>
                </div>
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  ), document.getElementById('modal-root'));
}

export default ReportModal;