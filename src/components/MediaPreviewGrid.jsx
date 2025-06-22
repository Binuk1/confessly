import { useState } from 'react';
import MediaCarouselModal from './MediaCarouselModal';

function MediaPreviewGrid({ files, removable = false, onRemove = () => {}, onMediaClick = () => {} }) {
  const [showModal, setShowModal] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const handleOpenModal = (index) => {
    if (!files || files.length === 0) return;
    setStartIndex(index);
    onMediaClick(index); // Use the prop if available
    setShowModal(true);
  };
  
  const displayedFiles = files.slice(0, 5);
  const extraCount = files.length - 5;

  return (
    <>
      <div className={`media-grid ${files.length > 5 ? 'limited' : ''}`}>
        {displayedFiles.map((file, index) => (
          // UPDATED: Added NSFW class and overlay
          <div
            className={`media-grid-item ${file.nsfw ? 'blurred' : ''}`}
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => handleOpenModal(index)}
            onKeyDown={(e) => (e.key === 'Enter' ? handleOpenModal(index) : null)}
          >
            {file.type === 'image' ? (
              <img src={file.url} alt={`Media ${index + 1}`} />
            ) : (
              <video src={file.url} muted preload="metadata" playsInline className="preview-video" />
            )}

            {file.nsfw && <div className="nsfw-overlay">NSFW</div>}

            {extraCount > 0 && index === 4 && (
              <div className="media-overlay">+{extraCount}</div>
            )}

            {removable && (
              <button type="button" className="remove-gif" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); onRemove(index); }}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <MediaCarouselModal
          files={files}
          currentIndex={startIndex}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default MediaPreviewGrid;