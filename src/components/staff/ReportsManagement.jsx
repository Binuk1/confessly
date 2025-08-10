// ReportsManagement.jsx - For Staff Dashboard
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import RequireStaffAuth from './RequireStaffAuth';
import './ReportsManagement.css';

const REASON_LABELS = {
  inappropriate: '🚫 Inappropriate content',
  harassment: '😡 Harassment or bullying', 
  sexual: '🔞 Sexual or offensive material',
  threat: '⚠️ Threat or self-harm',
  personal: '🕵️ Private or personal info shared',
  spam: '🗑️ Spam or fake confession',
  other: '❓ Other'
};

function ReportsManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, all, resolved
  const [selectedReport, setSelectedReport] = useState(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const q = filter === 'pending' 
      ? query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
      setLoading(false);
    });

    return () => unsub();
  }, [filter]);

  const handleResolveReport = async (reportId, action, contentId, contentType) => {
    if (!selectedReport) return;
    
    setProcessing(true);
    try {
      // Update report status
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser.uid,
        moderatorNotes: moderatorNotes.trim() || null,
        moderatorAction: action
      });

      // Take action on content if needed
      if (action === 'remove') {
        // Permanently delete the content
        const contentRef = doc(db, contentType === 'confession' ? 'confessions' : 'replies', contentId);
        await deleteDoc(contentRef);
        
        // Delete all replies if this is a confession
        if (contentType === 'confession') {
          const repliesQuery = query(
            collection(db, 'replies'),
            where('confessionId', '==', contentId)
          );
          const repliesSnapshot = await getDocs(repliesQuery);
          const deletePromises = repliesSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }
      }

      setSelectedReport(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to resolve report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismissReport = async (reportId) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'dismissed',
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser.uid,
        moderatorNotes: moderatorNotes.trim() || null,
        moderatorAction: 'dismiss'
      });

      setSelectedReport(null);
      setModeratorNotes('');
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('Failed to dismiss report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="reports-loading">Loading reports...</div>;
  }

  return (
    <RequireStaffAuth allowedRoles={['creator', 'admin', 'mod']}>
      <div className="reports-management">
        <div className="reports-header">
          <h2>📋 Reports Management</h2>
          <div className="reports-filters">
            <button 
              className={filter === 'pending' ? 'active' : ''}
              onClick={() => setFilter('pending')}
            >
              Pending ({reports.filter(r => r.status === 'pending').length})
            </button>
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All Reports
            </button>
          </div>
        </div>

        <div className="reports-list">
          {reports.length === 0 ? (
            <div className="no-reports">
              {filter === 'pending' ? '✅ No pending reports!' : 'No reports found.'}
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className={`report-item ${report.status}`}>
                <div className="report-summary">
                  <div className="report-reason">
                    {REASON_LABELS[report.reason] || report.reason}
                    {report.reason === 'other' && report.otherReason && (
                      <div className="other-reason-text">"{report.otherReason}"</div>
                    )}
                  </div>
                  <div className="report-meta">
                    <span className="content-type">{report.contentType}</span>
                    <span className="report-date">
                      {report.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                    </span>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </div>
                </div>

                <div className="reported-content">
                  <strong>Reported content:</strong>
                  <p>"{report.contentText}"</p>
                </div>

                {report.status === 'pending' && (
                  <div className="report-actions">
                    <button
                      className="review-btn"
                      onClick={() => setSelectedReport(report)}
                    >
                      Review & Action
                    </button>
                  </div>
                )}

                {report.status !== 'pending' && (
                  <div className="resolution-info">
                    <span>Action: {report.moderatorAction}</span>
                    {report.moderatorNotes && (
                      <span>Notes: {report.moderatorNotes}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Report Review Modal */}
        {selectedReport && (
          <div className="report-modal-overlay">
            <div className="report-review-modal">
              <div className="modal-header">
                <h3>Review Report</h3>
                <button onClick={() => setSelectedReport(null)}>×</button>
              </div>

              <div className="modal-content">
                <div className="report-details">
                  <p><strong>Reason:</strong> {REASON_LABELS[selectedReport.reason]}</p>
                  {selectedReport.otherReason && (
                    <p><strong>Additional details:</strong> {selectedReport.otherReason}</p>
                  )}
                  <p><strong>Content type:</strong> {selectedReport.contentType}</p>
                  <p><strong>Reported on:</strong> {selectedReport.createdAt?.toDate?.()?.toLocaleString()}</p>
                </div>

                <div className="reported-content-full">
                  <strong>Full content:</strong>
                  <div className="content-box">"{selectedReport.contentText}"</div>
                </div>

                <div className="moderator-notes">
                  <label htmlFor="notes">Moderator Notes (optional):</label>
                  <textarea
                    id="notes"
                    value={moderatorNotes}
                    onChange={(e) => setModeratorNotes(e.target.value)}
                    placeholder="Add any notes about this decision..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    className="dismiss-btn"
                    onClick={() => handleDismissReport(selectedReport.id)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Dismiss Report'}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showConfirmDelete && (
          <div className="confirmation-modal-overlay">
            <div className="confirmation-modal">
              <h4>Confirm Permanent Deletion</h4>
              <p>This will permanently delete the {selectedReport?.contentType} and all associated replies. This action cannot be undone.</p>
              <div className="confirmation-actions">
                <button onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                <button 
                  className="confirm-delete-btn"
                  onClick={() => {
                    handleResolveReport(
                      selectedReport.id, 
                      'remove', 
                      selectedReport.contentId, 
                      selectedReport.contentType
                    );
                    setShowConfirmDelete(false);
                  }}
                  disabled={processing}
                >
                  {processing ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireStaffAuth>
  );
}

export default ReportsManagement;