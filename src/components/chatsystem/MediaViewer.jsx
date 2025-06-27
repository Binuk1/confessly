import React, { useState } from 'react';
import './MediaViewer.css';

export default function MediaViewer({ media, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  if (!media || media.length === 0) return null;
  const current = media[index];
  const isImage = current.type.startsWith('image');
  const isVideo = current.type.startsWith('video');
  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-modal" onClick={e => e.stopPropagation()}>
        <button className="media-viewer-close" onClick={onClose}>&times;</button>
        <div className="media-viewer-content">
          {isImage && <img src={current.url} alt="media" className="media-viewer-img" />}
          {isVideo && <video src={current.url} controls className="media-viewer-video" />}
        </div>
        <div className="media-viewer-nav">
          <button onClick={() => setIndex(i => (i - 1 + media.length) % media.length)} disabled={media.length <= 1}>&#8592;</button>
          <span>{index + 1} / {media.length}</span>
          <button onClick={() => setIndex(i => (i + 1) % media.length)} disabled={media.length <= 1}>&#8594;</button>
        </div>
        <a href={current.url} download target="_blank" rel="noopener noreferrer" className="media-viewer-download">Download</a>
      </div>
    </div>
  );
}
