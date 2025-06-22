import React, { useEffect, useState } from 'react';
import { Modal, Carousel } from 'react-bootstrap';
import './MediaCarousel.css';

const MediaCarouselModal = ({ files, currentIndex, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const handleSelect = (selectedIndex) => {
    setActiveIndex(selectedIndex);
  };

  useEffect(() => {
    const videos = document.querySelectorAll('.carousel-item video');
    videos.forEach(video => { video.pause(); });
  }, [activeIndex]);

  return (
    <Modal show onHide={onClose} size="lg" centered backdrop="static" className="media-carousel-modal">
      <Modal.Body className="p-0 bg-dark text-white rounded">
        <Carousel
          activeIndex={activeIndex}
          onSelect={handleSelect}
          interval={null}
          indicators={false}
          nextIcon={<span className="carousel-control-next-icon custom-arrow" />}
          prevIcon={<span className="carousel-control-prev-icon custom-arrow" />}
        >
          {files.map((file, idx) => (
            // UPDATED: Added NSFW class and overlay
            <Carousel.Item key={idx} className={file.nsfw ? 'carousel-item-custom blurred' : 'carousel-item-custom'}>
              {file.type === 'image' ? (
                <img src={file.url} alt={`Media ${idx + 1}`} className="d-block w-100 rounded carousel-media" />
              ) : (
                <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  <video src={file.url} className="d-block w-100 rounded carousel-media" muted onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} controls controlsList="nodownload" />
                </div>
              )}
              {file.nsfw && (
                <div className="nsfw-overlay">NSFW</div>
              )}
            </Carousel.Item>
          ))}
        </Carousel>
      </Modal.Body>
      <button onClick={onClose} className="btn btn-light close-carousel-btn">
        ×
      </button>
    </Modal>
  );
};

export default MediaCarouselModal;