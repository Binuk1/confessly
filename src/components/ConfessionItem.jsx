import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import SkeletonItem from './SkeletonItem';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import { HiGif } from 'react-icons/hi2';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import './ConfessionItem.css';

const emojis = ['❤️', '😂', '😢', '😡', '👍'];

function ConfessionItem({ confession, rank }) {
  const [selectedEmoji, setSelectedEmoji] = useState(() => 
    localStorage.getItem(`reaction-${confession.id}`) || null
  );
  const [loading, setLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(confession.replyCount || 0);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyGifUrl, setReplyGifUrl] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replies, setReplies] = useState([]);
  
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

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

  async function toggleReaction(emoji) {
    try {
      const currentReactions = confession.reactions || {};
      const newReactions = { ...currentReactions };
      
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
      
      // TODO: Update Firestore with newReactions
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  }

  function handleReplySubmit(e) {
    e.preventDefault();
    // TODO: Implement reply submission logic
    console.log('Reply submitted:', { text: replyText, gifUrl: replyGifUrl });
  }

  return (
    <div className={`confession-item rank-${rank || ''}`}>
      {rank && <div className="rank-badge">{getBadge()}</div>}
      
      <p>{confession.text}</p>

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
            {emoji} {confession.reactions?.[emoji] || 0}
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
                  disabled={loading}
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
                    >
                      <HiGif size={24} />
                    </button>
                    <button
                      type="button"
                      ref={emojiPickerRef}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="action-button emoji-action"
                      aria-label="Add emoji"
                    >
                      <MdOutlineEmojiEmotions size={24} />
                    </button>
                  </div>
                  <div className="right-actions">
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={loading || (!replyText.trim() && !replyGifUrl)}
                      style={{ 
                        width: 'auto',
                        minWidth: 'unset',
                        paddingLeft: '1.1em',
                        paddingRight: '1.1em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {loading ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>

              {showEmojiPicker && (
                <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
                  <div
                    className="emoji-picker-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="emoji-picker-header">
                      <span className="emoji-picker-title">Select Emoji</span>
                      <button 
                        className="close-emoji-picker-modal" 
                        onClick={() => setShowEmojiPicker(false)}
                      >
                        Done
                      </button>
                    </div>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setReplyText(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      width={320}
                      height={350}
                      previewConfig={{ showPreview: false }}
                      searchPlaceholder="Search emojis..."
                      skinTonesDisabled
                      lazyLoadEmojis
                      className="minimal-emoji-picker"
                    />
                  </div>
                </div>
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

            {loading && replies.length === 0 && <SkeletonItem />}

            {!loading && replies.map((reply) => (
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
                  <span>
                    {reply.createdAt?.toDate 
                      ? new Date(reply.createdAt.toDate()).toLocaleString() 
                      : ''
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfessionItem;