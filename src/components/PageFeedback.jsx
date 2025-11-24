import { useState, useEffect, useRef } from 'react';
import { FaThumbsUp, FaThumbsDown, FaChevronRight } from 'react-icons/fa6';

const PageFeedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isHelpful, setIsHelpful] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const feedbackRef = useRef(null);

  // Auto-show after page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasGivenFeedback = localStorage.getItem('pageFeedbackGiven');
      if (!hasGivenFeedback) {
        setIsOpen(true);
      }
    }, 1000); // Show after 1 second

    return () => clearTimeout(timer);
  }, []);

  const handleFeedback = (helpful) => {
    setIsHelpful(helpful);
    setFeedbackGiven(true);
    localStorage.setItem('pageFeedbackGiven', 'true');
    
    // Show thank you message and then fade out
    setTimeout(() => {
      setIsVisible(false);
      // Remove from DOM after animation
      setTimeout(() => setIsOpen(false), 500);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={feedbackRef}
      className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-auto">
        {/* Main tab */}
        <div className="bg-blue-600 text-white p-2 rounded-r-lg shadow-lg flex flex-col items-center justify-center">
          {!feedbackGiven ? (
            <div className="flex flex-col items-center p-2">
              <span className="text-xs font-medium mb-1 text-center">Was this helpful?</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleFeedback(true)}
                  className="p-1.5 rounded-full hover:bg-blue-700 text-white transition-colors"
                  aria-label="Yes, this page was helpful"
                >
                  <FaThumbsUp size={16} />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="p-1.5 rounded-full hover:bg-blue-700 text-white transition-colors"
                  aria-label="No, this page was not helpful"
                >
                  <FaThumbsDown size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center p-2">
              <div className="flex items-center space-x-1">
                <span className="text-green-300">
                  {isHelpful ? <FaThumbsUp size={16} /> : <FaThumbsDown size={16} />}
                </span>
                <span className="text-xs text-white">Thanks!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageFeedback;
