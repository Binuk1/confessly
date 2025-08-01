import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import SkeletonItem from './SkeletonItem';
import GifPicker from './GifPicker';
import SimpleEmojiPicker from './SimpleEmojiPicker';
import { HiGif } from 'react-icons/hi2';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import './ConfessionItem.css';

const emojis = ['❤️', '😂', '😢', '😡', '👍'];

function ConfessionItem({ confession, rank }) {
  const [selectedEmoji, setSelectedEmoji] = useState(() => 
    localStorage.getItem(`reaction-${confession.id}`) || null
  );
  const [localReactions, setLocalReactions] = useState(confession.reactions || {});
  const [loading, setLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(confession.replyCount || 0);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyGifUrl, setReplyGifUrl] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showFullText, setShowFullText] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const TRUNCATE_LIMIT = 200; // characters limit for truncation
  const shouldTruncate = confession.text.length > TRUNCATE_LIMIT;
  const displayText = shouldTruncate && !showFullText 
    ? confession.text.substring(0, TRUNCATE_LIMIT) + '...'
    : confession.text;

  // Auto-dismiss error popup after 3s
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  function getBadge() {
    switch (rank) {
      case 1: 
        return '🥇';
      case 2: 
        return '🥈';
      case 3: 
        return '🥉';
      case 4:
      case 5: 
        return '🏅';
      default: 
        return null;
    }
  }

  // Listen for replies when replies are shown
  useEffect(() => {
    if (!showReplies) {
      setReplies([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Simplified query to avoid index requirement
      const repliesQuery = query(
        collection(db, 'replies'),
        where('confessionId', '==', confession.id)
        // Removed orderBy to avoid index requirement - we'll sort in memory
      );

      const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
        try {
          const repliesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort in memory by createdAt (ascending - oldest first)
          const sortedReplies = repliesData.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt.toDate() - b.createdAt.toDate();
          });
          
          setReplies(sortedReplies);
          setReplyCount(sortedReplies.length);
          setLoading(false);
        } catch (err) {
          console.error("Error processing replies:", err);
          setLoading(false);
        }
      }, (err) => {
        console.error("Error fetching replies:", err);
        if (err.code === 'permission-denied') {
          showError("Unable to load replies. Please try again later.");
        } else if (err.code === 'unavailable') {
          showError("Network error. Please check your connection.");
        }
        setReplies([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up replies listener:", err);
      setReplies([]);
      setLoading(false);
    }
  }, [showReplies, confession.id]);

  async function toggleReaction(emoji) {
    try {
      const newReactions = { ...localReactions };
      
      if (selectedEmoji === emoji) {
        // Remove reaction
        newReactions[emoji] = Math.max((newReactions[emoji] || 1) - 1, 0);
        if (newReactions[emoji] === 0) {
          delete newReactions[emoji];
        }
        setSelectedEmoji(null);
        localStorage.removeItem(`reaction-${confession.id}`);
      } else {
        // Add new reaction, remove old one if exists
        if (selectedEmoji) {
          newReactions[selectedEmoji] = Math.max((newReactions[selectedEmoji] || 1) - 1, 0);
          if (newReactions[selectedEmoji] === 0) {
            delete newReactions[selectedEmoji];
          }
        }
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        setSelectedEmoji(emoji);
        localStorage.setItem(`reaction-${confession.id}`, emoji);
      }
      
      // Update local state immediately for responsive UI
      setLocalReactions(newReactions);
      
      // Update Firestore
      const confessionRef = doc(db, 'confessions', confession.id);
      await updateDoc(confessionRef, {
        reactions: newReactions
      });
      
    } catch (err) {
      console.error("Error updating reaction:", err);
      showError("Failed to update reaction. Please try again.");
      // Revert local state on error
      setLocalReactions(confession.reactions || {});
      setSelectedEmoji(localStorage.getItem(`reaction-${confession.id}`) || null);
    }
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    
    // For replies: allow GIF-only or emoji-only, but require SOME content
    const hasText = replyText.trim().length > 0;
    const hasGif = replyGifUrl && replyGifUrl.trim().length > 0;
    
    if (!hasText && !hasGif) {
      showError('Please enter some text or add a GIF to your reply.');
      return;
    }

    setSubmittingReply(true);
    try {
      // Add reply to replies collection
      await addDoc(collection(db, 'replies'), {
        confessionId: confession.id,
        text: replyText.trim(),
        gifUrl: replyGifUrl || null,
        createdAt: serverTimestamp(),
      });

      // Update confession reply count in the parent document
      const newReplyCount = replyCount + 1;
      const confessionRef = doc(db, 'confessions', confession.id);
      await updateDoc(confessionRef, {
        replyCount: newReplyCount
      });

      // Update local reply count immediately
      setReplyCount(newReplyCount);

      // Clear form but keep replies visible
      setReplyText('');
      setReplyGifUrl('');
      setShowGifPicker(false);
      setShowEmojiPicker(false);

      // Focus back to textarea for easier follow-up replies
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);

    } catch (err) {
      console.error("Error submitting reply:", err);
      showError("Failed to submit reply. Please try again.");
    } finally {
      setSubmittingReply(false);
    }
  }

  return (
    <div className={`confession-item rank-${rank || ''}`}>
      {rank && <div className="rank-badge">{getBadge()}</div>}
      
      <p>{displayText}</p>
      
      {shouldTruncate && (
        <button 
          className="see-more-btn"
          onClick={() => setShowFullText(!showFullText)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
            padding: '0.25rem 0',
            marginTop: '0.25rem'
          }}
        >
          {showFullText ? 'See less' : 'See more'}
        </button>
      )}

      {confession.mediaUrl && (
        <div className="media-container">
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Confession media" 
              className="confession-media" 
              loading="lazy" 
            />
          ) : (
            <video 
              src={confession.mediaUrl} 
              controls 
              className="confession-media" 
              loading="lazy" 
            />
          )}
        </div>
      )}

      {confession.gifUrl && !confession.mediaUrl && (
        <div className="media-container">
          <img 
            src={confession.gifUrl} 
            alt="Confession GIF" 
            className="confession-gif" 
            loading="lazy" 
          />
        </div>
      )}

      <div className="reaction-bar">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className={selectedEmoji === emoji ? 'selected' : ''}
            onClick={() => toggleReaction(emoji)}
            disabled={loading}
            aria-label={`React with ${emoji}`}
          >
            {emoji} {localReactions[emoji] || 0}
          </button>
        ))}
      </div>

      <div className="reply-section">
        <button
          className="toggle-replies-btn"
          onClick={() => setShowReplies(!showReplies)}
          disabled={loading && !showReplies}
          aria-expanded={showReplies}
        >
          {showReplies ? 'Hide Replies' : `Show Replies (${replyCount})`}
        </button>

        {showReplies && (
          <div className="replies-container">
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleReplySubmit} className="reply-form">
              <div className="textarea-wrapper reply-wrapper">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  disabled={submittingReply}
                  style={{ resize: 'none' }} // Disable resize
                />
                <div className="reply-actions" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  <div className="left-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowGifPicker(!showGifPicker)}
                      className="action-button gif-button"
                      aria-label="Add GIF"
                      disabled={submittingReply}
                    >
                      <HiGif size={24} />
                    </button>
                    <button
                      type="button"
                      ref={emojiPickerRef}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="action-button emoji-action"
                      aria-label="Add emoji"
                      disabled={submittingReply}
                    >
                      <MdOutlineEmojiEmotions size={24} />
                    </button>
                  </div>
                  <div className="right-actions">
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={submittingReply || (!replyText.trim() && !replyGifUrl)}
                      style={{ 
                        width: 'auto',
                        minWidth: 'unset',
                        paddingLeft: '1.1em',
                        paddingRight: '1.1em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {submittingReply ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>

              {showEmojiPicker && (
                <SimpleEmojiPicker
                  onEmojiClick={(emojiData) => {
                    setReplyText(prev => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </form>

            {replyGifUrl && (
              <div className="gif-preview-container">
                <img 
                  src={replyGifUrl} 
                  alt="Reply GIF preview" 
                  className="gif-preview" 
                />
                <button 
                  type="button" 
                  onClick={() => setReplyGifUrl('')} 
                  className="remove-gif"
                  disabled={submittingReply}
                >
                  Remove
                </button>
              </div>
            )}

            {showGifPicker && (
              <GifPicker
                onSelect={(url) => {
                  setReplyGifUrl(url);
                  setTimeout(() => setShowGifPicker(false), 0);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {loading && replies.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Loading replies...
              </div>
            )}

            {replies.map((reply) => (
              <div key={reply.id} className="reply-item">
                {reply.text && <p>{reply.text}</p>}
                {reply.gifUrl && (
                  <div className="media-container">
                    <img 
                      src={reply.gifUrl} 
                      alt="Reply GIF" 
                      className="reply-gif" 
                      loading="lazy" 
                    />
                  </div>
                )}
                <div className="reply-meta">
                  <span>
                    {reply.createdAt?.toDate 
                      ? new Date(reply.createdAt.toDate()).toLocaleString() 
                      : 'Just now'
                    }
                  </span>
                </div>
              </div>
            ))}

            {submittingReply && (
              <div className="reply-item" style={{ opacity: 0.7 }}>
                <p>{replyText || <em>Posting reply...</em>}</p>
                {replyGifUrl && (
                  <div className="media-container">
                    <img 
                      src={replyGifUrl} 
                      alt="Reply GIF preview" 
                      className="reply-gif" 
                      loading="lazy" 
                    />
                  </div>
                )}
                <div className="reply-meta">
                  <span>Posting...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfessionItem;