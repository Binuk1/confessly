import React from 'react';
import { FaTimes, FaPlay } from 'react-icons/fa';

export default function MediaPreviewGrid({ files, onRemove, maxGrid = 5, readOnly = false, onMediaClick }) {
  const showOverlay = files.length > maxGrid;
  const gridFiles = showOverlay ? files.slice(0, maxGrid) : files;

  const getGridStyle = () => {
    if (files.length === 1) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    if (files.length === 2) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
    return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  };

  const handleMediaClick = (index) => {
    if (readOnly && onMediaClick) {
      onMediaClick(index);
    }
  };

  return (
    <div className="media-preview-grid" style={{
      display: 'grid',
      gap: 4,
      ...getGridStyle(),
      width: '100%',
      maxWidth: 300,
      margin: '0 auto 8px auto'
    }}>
      {gridFiles.map((file, i) => {
        const isVideo = file.type.startsWith('video');
        const isLast = showOverlay && i === maxGrid - 1;
        return (
          <div 
            key={i} 
            className="media-preview-tile" 
            style={{ 
              position: 'relative', 
              aspectRatio: '1/1', 
              overflow: 'hidden', 
              borderRadius: 6,
              cursor: readOnly ? 'pointer' : 'default'
            }}
            onClick={() => handleMediaClick(i)}
          >
            {isVideo ? (
              <>
                <video src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                <FaPlay style={{ position: 'absolute', top: 4, left: 4, color: '#fff', fontSize: 12, opacity: 0.8 }} />
              </>
            ) : (
              <img src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {!readOnly && (
              <button
                className="media-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                style={{
                  position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', zIndex: 2
                }}
                aria-label="Remove"
              ><FaTimes /></button>
            )}
            {isLast && (
              <div className="media-more-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700
              }}>
                +{files.length - maxGrid + 1} more
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 