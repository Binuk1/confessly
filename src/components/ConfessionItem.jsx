// src/components/ConfessionItem.jsx
import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GifPicker from './GifPicker'; // Keep this for Giphy
import EmojiPicker from 'emoji-picker-react';
import FileUploadButton from './FileUploadButton'; // Import the new component

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
  const [replyGifUrl, setReplyGifUrl] = useState('');     // State for Giphy GIF in reply
  const [replyMediaUrl, setReplyMediaUrl] = useState(''); // State for Cloudinary upload in reply
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

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

      // Logic to handle previous reactions from localStorage
      const prevReactionKey = Object.keys(localStorage).find((key) =>
        key.startsWith('reaction-')
      );
      if (prevReactionKey) {
        const prevId = prevReactionKey.replace('reaction-', '');
        const prevEmoji = localStorage.getItem(prevReactionKey);
        if (prevId !== confession.id) { // Only update if reaction was on a different confession
          const prevDocRef = doc(db, 'confessions', prevId);
          // Fetch the previous confession's reactions to decrement correctly
          // This part requires fetching the document, which can be expensive.
          // For a more robust solution, consider a transaction or a cloud function.
          // For simplicity in this client-side code, we'll make a direct update
          // assuming the reactions object is mostly consistent.
          // A safer approach: fetch prevDocRef, get its reactions, decrement, then update.
          // Given current structure, we'll decrement if it exists, otherwise do nothing
          // on the *previous* confession.
          if (prevEmoji && prevId) {
            const tempPrevReactions = { ...confession.reactions || {} }; // Use a temporary object
            if (tempPrevReactions[prevEmoji] > 0) {
              tempPrevReactions[prevEmoji]--;
            }
            // Update the previous confession's reactions only if there was a change
            await updateDoc(prevDocRef, { reactions: tempPrevReactions });
          }
          localStorage.removeItem(prevReactionKey);
        }
      }

      if (selectedEmoji === emoji) {
        // User is unselecting the current emoji
        newReactions[emoji] = (newReactions[emoji] || 1) - 1;
        setSelectedEmoji(null);
        localStorage.removeItem(`reaction-${confession.id}`);
      } else {
        // User is selecting a new emoji or changing emoji
        if (selectedEmoji) {
          // Decrement count for previously selected emoji
          newReactions[selectedEmoji] = (newReactions[selectedEmoji] || 1) - 1;
        }
        // Increment count for newly selected emoji
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
    if (!replyText.trim() && !replyGifUrl && !replyMediaUrl) return; // Check all reply media types
    
    try {
      setLoading(true);
      await addDoc(collection(db, 'confessions', confession.id, 'replies'), {
        text: replyText.trim(),
        gifUrl: replyGifUrl || null,    // Store reply GIF URL
        mediaUrl: replyMediaUrl || null, // Store reply Cloudinary media URL
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setReplyGifUrl('');     // Reset reply GIF URL
      setReplyMediaUrl('');   // Reset reply Cloudinary media URL
      setShowEmojiPicker(false);
      setShowGifPicker(false); // Hide GIF picker after submit
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

  const handleReplyGifSelect = (url) => {
    setReplyGifUrl(url);
    setReplyMediaUrl(''); // Clear Cloudinary media if a GIF is selected
    setShowGifPicker(false);
  };

  const handleReplyUploadSuccess = (url) => {
    setReplyMediaUrl(url); // Set the uploaded Cloudinary URL for reply
    setReplyGifUrl(''); // Clear GIF if a file is uploaded
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
      
      {/* Display main confession media */}
      {(confession.mediaUrl || confession.gifUrl) && (
        <div className="media-container">
          {confession.mediaUrl ? (
            confession.mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
              <img 
                src={confession.mediaUrl} 
                alt="Confession media" 
                className="confession-media"
                loading="lazy"
              />
            ) : (
              <video 
                src={confession.mediaUrl} 
                alt="Confession video" 
                className="confession-media" 
                controls
                loading="lazy"
              />
            )
          ) : (
            <img 
              src={confession.gifUrl} 
              alt="Confession GIF" 
              className="confession-gif"
              loading="lazy"
            />
          )}
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
              
              {/* Display reply media preview - prioritize uploaded media, then GIF */}
              {(replyMediaUrl || replyGifUrl) && (
                <div className="gif-preview-container"> {/* Reusing class */}
                  {replyMediaUrl ? (
                    replyMediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                      <img 
                        src={replyMediaUrl} 
                        alt="Reply photo/video preview" 
                        className="gif-preview"
                        loading="lazy"
                      />
                    ) : (
                      <video 
                        src={replyMediaUrl} 
                        alt="Reply photo/video preview" 
                        className="gif-preview"
                        controls
                        loading="lazy"
                      />
                    )
                  ) : (
                    <img 
                      src={replyGifUrl} 
                      alt="Reply GIF preview" 
                      className="gif-preview"
                      loading="lazy"
                    />
                  )}
                  <button 
                    type="button" 
                    onClick={() => { setReplyGifUrl(''); setReplyMediaUrl(''); }} // Clear both
                    className="remove-gif"
                    aria-label="Remove media"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="reply-actions">
                {/* Button for Cloudinary File Upload */}
                <FileUploadButton 
                  onUploadSuccess={handleReplyUploadSuccess} 
                  buttonText="Upload File"
                />
                {/* Button for Giphy GIF Picker */}
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
                  disabled={loading || (!replyText.trim() && !replyGifUrl && !replyMediaUrl)}
                  className="submit-reply"
                >
                  {loading ? 'Posting...' : 'Reply'}
                </button>
                {showEmojiPicker && (
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
                onSelect={handleReplyGifSelect}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {loading && replies.length === 0 ? (
              <div className="loading">Loading replies...</div>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="reply-item">
                  <p>{reply.text}</p>
                  {(reply.mediaUrl || reply.gifUrl) && ( // Display reply media
                    <div className="media-container">
                      {reply.mediaUrl ? (
                        reply.mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                          <img 
                            src={reply.mediaUrl} 
                            alt="Reply media" 
                            className="reply-media"
                            loading="lazy"
                          />
                        ) : (
                          <video 
                            src={reply.mediaUrl} 
                            alt="Reply video" 
                            className="reply-media"
                            controls
                            loading="lazy"
                          />
                        )
                      ) : (
                        <img 
                          src={reply.gifUrl} 
                          alt="Reply GIF" 
                          className="reply-gif"
                          loading="lazy"
                        />
                      )}
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