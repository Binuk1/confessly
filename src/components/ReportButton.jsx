import { useState } from 'react';
import { IoFlagOutline } from "react-icons/io5"; // Changed to outlined version
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
        <IoFlagOutline color="#dc3545" size="1.5em" />
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