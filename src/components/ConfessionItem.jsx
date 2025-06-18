import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';

const emojis = ['❤️', '😂', '😢', '😡', '👍'];

function ConfessionItem({ confession, rank }) {
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyCount, setReplyCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyGifUrl, setReplyGifUrl] = useState('');
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

  // REMOVED: The useEffect hook for preventing mobile zoom is no longer needed
  // as this is now handled purely by CSS for better performance and reliability.

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        const isEmojiButton = event.target.closest('.emoji-button');
        if (!isEmojiButton) {
          setShowEmojiPicker(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load reactions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`reaction-${confession.id}`);
    if (stored) {
      setSelectedEmoji(stored);
    }
  }, [confession.id]);

  // Set up reply count listener
  useEffect(() => {
    const repliesRef = collection(db, 'confessions', confession.id, 'replies');
    const unsubscribeCount = onSnapshot(repliesRef, (snapshot) => {
      setReplyCount(snapshot.size);
    });
    return () => unsubscribeCount();
  }, [confession.id]);

  // Load full replies when toggled
  useEffect(() => {
    if (!showReplies) return;

    setLoading(true);
    const q = query(
      collection(db, 'confessions', confession.id, 'replies'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeReplies = onSnapshot(q, 
      (snapshot) => {
        setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error loading replies:", err);
        setError("Failed to load replies. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribeReplies();
  }, [showReplies, confession.id]);

  const toggleReaction = async (emoji) => {
    try {
      const docRef = doc(db, 'confessions', confession.id);
      const currentReactions = confession.reactions || {};
      const newReactions = { ...currentReactions };

      const prevReactionKey = Object.keys(localStorage).find((key) =>
        key.startsWith('reaction-')
      );
      if (prevReactionKey) {
        const prevId = prevReactionKey.replace('reaction-', '');
        const prevEmoji = localStorage.getItem(prevReactionKey);
        if (prevId !== confession.id) {
          const prevDocRef = doc(db, 'confessions', prevId);
          const prevReactions = confession.reactions || {};
          const updated = { ...prevReactions };
          if (updated[prevEmoji]) {
            updated[prevEmoji] = updated[prevEmoji] - 1;
            await updateDoc(prevDocRef, { reactions: updated });
          }
          localStorage.removeItem(prevReactionKey);
        }
      }

      if (selectedEmoji === emoji) {
        newReactions[emoji] = (newReactions[emoji] || 1) - 1;
        setSelectedEmoji(null);
        localStorage.removeItem(`reaction-${confession.id}`);
      } else {
        if (selectedEmoji) {
          newReactions[selectedEmoji] = (newReactions[selectedEmoji] || 1) - 1;
        }
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        setSelectedEmoji(emoji);
        localStorage.setItem(`reaction-${confession.id}`, emoji);
      }

      await updateDoc(docRef, { reactions: newReactions });
    } catch (err) {
      console.error("Error updating reaction:", err);
      setError("Failed to update reaction. Please try again.");
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyGifUrl) return;
    
    try {
      setLoading(true);
      await addDoc(collection(db, 'confessions', confession.id, 'replies'), {
        text: replyText.trim(),
        gifUrl: replyGifUrl || null,
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setReplyGifUrl('');
      setShowEmojiPicker(false);
      setError(null);
    } catch (err) {
      console.error("Error submitting reply:", err);
      setError("Failed to post reply. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setReplyText(prev => prev + emojiData.emoji);
    textareaRef.current.focus();
  };

  const getBadge = () => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      case 4:
      case 5: return '🏅';
      default: return null;
    }
  };

  return (
    <div className={`confession-item rank-${rank || ''}`}>
      {rank && <div className="rank-badge">{getBadge()}</div>}
      <p>{confession.text}</p>
      
      {confession.gifUrl && (
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
            {emoji} {confession.reactions?.[emoji] || 0}
          </button>
        ))}
      </div>

      <div className="reply-section">
        <button 
          className="toggle-replies-btn"
          onClick={() => setShowReplies(!showReplies)}
          disabled={loading}
          aria-expanded={showReplies}
        >
          {showReplies ? 'Hide Replies' : `Show Replies (${replyCount})`}
        </button>

        {showReplies && (
          <div className="replies-container">
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleReplySubmit} className="reply-form">
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                rows={2}
                disabled={loading}
                className="reply-textarea"
              />
              
              {replyGifUrl && (
                <div className="gif-preview-container">
                  <img 
                    src={replyGifUrl} 
                    alt="Reply GIF preview" 
                    className="gif-preview"
                    loading="lazy"
                  />
                  <button 
                    type="button" 
                    onClick={() => setReplyGifUrl('')}
                    className="remove-gif"
                    aria-label="Remove GIF"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="reply-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker(!showGifPicker);
                    setShowEmojiPicker(false);
                  }}
                  className="gif-button"
                  disabled={loading}
                  aria-label="Add GIF"
                >
                  Add GIF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowGifPicker(false);
                  }}
                  className="emoji-button"
                  disabled={loading}
                  aria-label="Add emoji"
                >
                  😊 Add Emoji
                </button>
                <button 
                  type="submit" 
                  disabled={loading || (!replyText.trim() && !replyGifUrl)}
                  className="submit-reply"
                >
                  {loading ? 'Posting...' : 'Reply'}
                </button>
                {showEmojiPicker && (
                  /* UPDATED: Added the "upwards" class to change pop-up direction */
                  <div className="emoji-picker-container upwards" ref={emojiPickerRef}>
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      width={300}
                      height={350}
                      previewConfig={{ showPreview: false }}
                      searchPlaceholder="Search emojis..."
                      skinTonesDisabled
                      lazyLoadEmojis
                    />
                  </div>
                )}
              </div>
            </form>

            {showGifPicker && (
              <GifPicker 
                onSelect={(url) => {
                  setReplyGifUrl(url);
                  setShowGifPicker(false);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {loading && replies.length === 0 ? (
              <div className="loading">Loading replies...</div>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="reply-item">
                  <p>{reply.text}</p>
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
                    <span>{new Date(reply.createdAt?.toDate()).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfessionItem;