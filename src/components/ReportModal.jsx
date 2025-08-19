// ReportModal.jsx
import { useState, useRef, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import './ReportModal.css';

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
  const textareaRef = useRef(null);

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
    }, 300); // Match animation duration
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReason) return;
    if (selectedReason === 'other' && !otherReason.trim()) return;

    setSubmitting(true);
    try {
      // Create the report
      await addDoc(collection(db, 'reports'), {
        contentId,
        contentType,
        contentText: contentText.substring(0, 200),
        reason: selectedReason,
        otherReason: selectedReason === 'other' ? otherReason.trim() : null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Update the content's report count
      const contentRef = doc(db, contentType === 'confession' ? 'confessions' : 'replies', contentId);
      await updateDoc(contentRef, { reportCount: increment(1) });

      setSubmitted(true);
      setTimeout(handleClose, 2500); // Auto close after showing success
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
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
              <button className="report-modal__close-btn" onClick={handleClose} aria-label="Close">×</button>
            </header>

            <main className="report-modal__body">
              <div className="report-modal__preview">
                <p>"{contentText.substring(0, 100)}{contentText.length > 100 ? '...' : ''}"</p>
              </div>

              <form onSubmit={handleSubmit} className="report-modal__form">
                <p className="report-modal__prompt">Why are you reporting this?</p>
                
                <div className="report-modal__reasons">
                  {REPORT_REASONS.map(reason => (
                    <label key={reason.id} className={`reason-card ${selectedReason === reason.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="reason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        disabled={submitting}
                      />
                      <span className="reason-card__emoji">{reason.emoji}</span>
                      <span className="reason-card__label">{reason.label}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === 'other' && (
                  <div className="report-modal__other-reason">
                    <textarea
                      ref={textareaRef}
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Please provide more details..."
                      maxLength={500}
                      disabled={submitting}
                      required
                      className="auto-resize-textarea"
                    />
                    <div className="char-count">{otherReason.length}/500</div>
                  </div>
                )}

                <footer className="report-modal__footer">
                  <button type="button" className="report-modal__btn--cancel" onClick={handleClose} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="report-modal__btn--submit" disabled={submitting || !selectedReason || (selectedReason === 'other' && !otherReason.trim())}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </footer>
              </form>
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportModal;