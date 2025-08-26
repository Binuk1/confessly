import { useState, useRef, useEffect } from 'react';
import { MdOutlineAddReaction } from 'react-icons/md';
import './ReactionBar.css';

const emojis = ['❤️', '😂', '😢', '😡', '👍'];

function ReactionBar({ 
  selectedEmoji, 
  localReactions, 
  onReactionToggle,
  compact = false,
}) {
  const [showMobileReactions, setShowMobileReactions] = useState(false);
  const [isHoldingReaction, setIsHoldingReaction] = useState(false);
  const reactionTimeoutRef = useRef(null);
  const mobileReactionsRef = useRef(null);

  // Handle clicking outside to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileReactionsRef.current && !mobileReactionsRef.current.contains(event.target)) {
        setShowMobileReactions(false);
      }
    };

    if (showMobileReactions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileReactions]);

  // Mobile reaction handlers
  const handleReactionHoldStart = () => {
    setIsHoldingReaction(true);
    reactionTimeoutRef.current = setTimeout(() => {
      setShowMobileReactions(true);
    }, 300); // Show after 300ms hold
  };

  const handleReactionHoldEnd = () => {
    setIsHoldingReaction(false);
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = null;
    }
  };

  const handleMobileReactionSelect = (emoji) => {
    onReactionToggle(emoji);
    setShowMobileReactions(false);
  };

  const handleReactionButtonClick = () => {
    if (selectedEmoji) {
      // If already reacted, remove reaction
      onReactionToggle(selectedEmoji);
    } else {
      // If no reaction, show popup
      setShowMobileReactions(!showMobileReactions);
    }
  };

  return (
    <div className={`reaction-bar ${compact ? 'compact' : ''}`}>
      {/* Desktop reaction buttons (hidden in compact mode) */}
      {!compact && (
        <div className="desktop-reactions">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              className={selectedEmoji === emoji ? 'selected' : ''}
              onClick={() => onReactionToggle(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji} {localReactions[emoji] || 0}
            </button>
          ))}
        </div>
      )}

      {/* Mobile reaction button */}
      <div className="mobile-reactions" ref={mobileReactionsRef}>
        <button
          className={`mobile-reaction-btn ${selectedEmoji ? 'has-reaction' : ''} ${isHoldingReaction ? 'holding' : ''}`}
          onMouseDown={handleReactionHoldStart}
          onMouseUp={handleReactionHoldEnd}
          onMouseLeave={handleReactionHoldEnd}
          onTouchStart={handleReactionHoldStart}
          onTouchEnd={handleReactionHoldEnd}
          onClick={handleReactionButtonClick}
          aria-label="React"
        >
          {selectedEmoji ? (
            <span className="selected-reaction">
              {selectedEmoji} {localReactions[selectedEmoji] || 0}
            </span>
          ) : (
            <span className="reaction-icon">
              <MdOutlineAddReaction size={20} />
            </span>
          )}
        </button>

        {/* Mobile reaction popup */}
        {showMobileReactions && (
          <div className="mobile-reaction-popup">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className={`mobile-reaction-option ${selectedEmoji === emoji ? 'selected' : ''}`}
                onClick={() => handleMobileReactionSelect(emoji)}
                aria-label={`React with ${emoji}`}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{localReactions[emoji] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReactionBar;
