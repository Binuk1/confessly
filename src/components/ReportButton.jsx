import { useState } from 'react';
import ReportModal from './ReportModal';
import './ReportButton.css';

function ReportButton({ contentId, contentType, contentText }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className="report-button"
        onClick={() => setShowModal(true)}
        aria-label={`Report this ${contentType}`}
        title={`Report this ${contentType}`}
      >
        🚩
      </button>

      <ReportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        contentId={contentId}
        contentType={contentType}
        contentText={contentText}
      />
    </>
  );
}

export default ReportButton;