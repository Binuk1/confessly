// ReportModal.jsx
import { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReason) {
      alert('Please select a reason for reporting.');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      alert('Please explain why you\'re reporting this content.');
      return;
    }

    setSubmitting(true);

    try {
      // Create the report
      await addDoc(collection(db, 'reports'), {
        contentId,
        contentType,
        contentText: contentText.substring(0, 200), // Store first 200 chars for context
        reason: selectedReason,
        otherReason: selectedReason === 'other' ? otherReason.trim() : null,
        status: 'pending', // pending, resolved, dismissed
        createdAt: serverTimestamp(),
        resolvedAt: null,
        resolvedBy: null,
        moderatorNotes: null
      });

      // Update the content's report count
      const contentRef = doc(db, contentType === 'confession' ? 'confessions' : 'replies', contentId);
      await updateDoc(contentRef, {
        reportCount: increment(1)
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReason('');
        setOtherReason('');
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (submitted) {
    return (
      <div className="report-modal-overlay" onClick={onClose}>
        <div className="report-modal" onClick={e => e.stopPropagation()}>
          <div className="report-success">
            <h3>✅ Report Submitted</h3>
            <p>Thank you for helping keep our community safe.but low-key we do not give a damn sht.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <h3>🚩 Report This {contentType === 'confession' ? 'Confession' : 'Reply'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="report-content">
          <div className="content-preview">
            <p><strong>Content:</strong> "{contentText.substring(0, 100)}{contentText.length > 100 ? '...' : ''}"</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="report-question">
              <p><em>Why are you reporting this?</em></p>
            </div>

            <div className="report-reasons">
              {REPORT_REASONS.map(reason => (
                <label key={reason.id} className="reason-option">
                  <input
                    type="radio"
                    name="reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={submitting}
                  />
                  <span className="reason-label">
                    {reason.emoji} {reason.label}
                  </span>
                </label>
              ))}
            </div>

            {selectedReason === 'other' && (
              <div className="other-reason">
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please explain why you're reporting this content..."
                  rows={3}
                  maxLength={500}
                  disabled={submitting}
                />
                <div className="char-count">{otherReason.length}/500</div>
              </div>
            )}

            <div className="report-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !selectedReason}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;