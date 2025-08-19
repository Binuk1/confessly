import { useState, useEffect } from 'react';
import { FaAngleDoubleUp } from "react-icons/fa";
import './GoToTop.css';

function GoToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down 300px
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <>
      {isVisible && (
        <button
          className="go-to-top-button"
          onClick={scrollToTop}
          aria-label="Go to top"
        >
          <FaAngleDoubleUp />
        </button>
      )}
    </>
  );
}

export default GoToTop;
