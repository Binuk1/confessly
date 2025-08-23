// ReportModal.jsx
import { useState, useRef, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
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
      // Get scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
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
  contentText
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOtherView, setShowOtherView] = useState(false);
  const textareaRef = useRef(null);
  
  // Handle modal effects (hide go-to-top, disable scroll)
  useModalEffects(isOpen);

  // Auto-resize textarea
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
      // Reset state after animation
      setIsClosing(false);
      setSubmitted(false);
      setSelectedReason('');
      setOtherReason('');
      setShowOtherView(false);
    }, 300); // Match animation duration
  };

  const handleReasonSelect = (reasonId) => {
    setSelectedReason(reasonId);
    if (reasonId === 'other') {
      setShowOtherView(true);
    } else {
      setShowOtherView(false);
      setOtherReason(''); // Clear other reason when switching away
    }
    // Clear reason error when selecting
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});
    
    try {
      // Create the report with additional validation metadata
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
        reportedFrom: window.location.pathname
      });

      // Update the content's report count
      const contentRef = doc(db, contentType === 'confession' ? 'confessions' : 'replies', contentId);
      await updateDoc(contentRef, { reportCount: increment(1) });

      setSubmitted(true);
      setTimeout(handleClose, 3000); // Auto close after showing success
    } catch (error) {
      console.error('Error submitting report:', error);
      setErrors({ submit: 'Failed to submit report. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
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
                {/* Main Reasons View */}
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

                {/* Other Reason View */}
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
  );
}

export default ReportModal;