// ✅ ConfessionItem.jsx — Final version with Smooth Scroll
// Includes:
// - Media uploads
// - GIF support
// - Emoji reactions
// - Smooth scroll to latest reply
// - Proper timestamp fallback
// - All your original features intact

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyGifUrl, setReplyGifUrl] = useState('');
  const [replyMediaUrl, setReplyMediaUrl] = useState('');
  const [replyMediaType, setReplyMediaType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  const lastReplyRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(`reaction-${confession.id}`);
    if (stored) setSelectedEmoji(stored);
  }, [confession.id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        const isEmojiButton = e.target.closest('.action-button');
        if (!isEmojiButton) setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const repliesRef = collection(db, 'confessions', confession.id, 'replies');
    const unsub = onSnapshot(repliesRef, snap => setReplyCount(snap.size));
    return () => unsub();
  }, [confession.id]);

  useEffect(() => {
    if (!showReplies) return;
    setLoading(true);
    const q = query(collection(db, 'confessions', confession.id, 'replies'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const replyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReplies(replyData);
      setLoading(false);
      setError(null);
    }, (err) => {
      setError("Failed to load replies.");
      setLoading(false);
    });
    return () => unsub();
  }, [showReplies, confession.id]);

  const toggleReaction = async (emoji) => {
    try {
      const docRef = doc(db, 'confessions', confession.id);
      const newReactions = { ...(confession.reactions || {}) };
      if (selectedEmoji === emoji) {
        newReactions[emoji] = (newReactions[emoji] || 1) - 1;
        setSelectedEmoji(null);
        localStorage.removeItem(`reaction-${confession.id}`);
      } else {
        if (selectedEmoji) newReactions[selectedEmoji] = (newReactions[selectedEmoji] || 1) - 1;
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        setSelectedEmoji(emoji);
        localStorage.setItem(`reaction-${confession.id}`, emoji);
      }
      await updateDoc(docRef, { reactions: newReactions });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const handleReplyFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReplyGifUrl('');
    setReplyMediaUrl('');
    setUploadError('');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');
    const CLOUD_NAME = 'dqptpxh4r';
    try {
      const type = file.type.startsWith('image') ? 'image' : 'video';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setReplyMediaUrl(data.secure_url);
      setReplyMediaType(type);
    } catch (err) {
      setUploadError('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyGifUrl && !replyMediaUrl) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'confessions', confession.id, 'replies'), {
        text: replyText.trim(),
        gifUrl: replyGifUrl || null,
        mediaUrl: replyMediaUrl || null,
        mediaType: replyMediaType || null,
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setReplyGifUrl('');
      setReplyMediaUrl('');
      setReplyMediaType('');
      setUploadError('');
      setShowEmojiPicker(false);
      setTimeout(() => {
        lastReplyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err) {
      setError("Reply failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setReplyText((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
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
      {confession.mediaUrl && (
        <div className="media-container">
          {confession.mediaType === 'image' && <img src={confession.mediaUrl} alt="media" className="confession-media" loading="lazy" />}
          {confession.mediaType === 'video' && <video src={confession.mediaUrl} controls className="confession-media" loading="lazy" />}
        </div>
      )}
      {confession.gifUrl && !confession.mediaUrl && (
        <div className="media-container">
          <img src={confession.gifUrl} alt="GIF" className="confession-gif" loading="lazy" />
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
              <div className="textarea-wrapper reply-wrapper">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  disabled={submitting || isUploading}
                />
                <div className="reply-actions">
                  <label className="file-input-label">
                    📷
                    <input type="file" accept="image/*,video/*" onChange={handleReplyFileChange} className="file-input" disabled={isUploading} />
                  </label>
                  <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className="action-button" aria-label="Add GIF">GIF</button>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="action-button" aria-label="Add Emoji">😊</button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={submitting || isUploading || (!replyText.trim() && !replyGifUrl && !replyMediaUrl)}
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker-container upwards" ref={emojiPickerRef}>
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={350}
                        previewConfig={{ showPreview: false }}
                        searchPlaceholder="Search emojis..."
                        autoFocusSearch={false}
                        skinTonesDisabled
                        lazyLoadEmojis
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>

            {replyMediaUrl && (
              <div className="gif-preview-container">
                {replyMediaType === 'image' && <img src={replyMediaUrl} alt="preview" className="gif-preview" />}
                {replyMediaType === 'video' && <video src={replyMediaUrl} controls className="gif-preview" />}
                <button type="button" onClick={() => { setReplyMediaUrl(''); setUploadError(''); }} className="remove-gif">×</button>
              </div>
            )}
            {replyGifUrl && !replyMediaUrl && (
              <div className="gif-preview-container">
                <img src={replyGifUrl} alt="GIF preview" className="gif-preview" />
                <button type="button" onClick={() => setReplyGifUrl('')} className="remove-gif">×</button>
              </div>
            )}

            {isUploading && <div className="loading">Uploading...</div>}
            {uploadError && <div className="error-message">{uploadError}</div>}

            {showGifPicker && (
              <GifPicker
                onSelect={(url) => {
                  setReplyGifUrl(url);
                  setReplyMediaUrl('');
                  setShowGifPicker(false);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {loading && replies.length === 0 ? (
              <div className="loading">Loading replies...</div>
            ) : (
              replies.map((reply, index) => (
                <div
                  key={reply.id}
                  className="reply-item"
                  ref={index === 0 ? lastReplyRef : null}
                >
                  <p>{reply.text}</p>
                  {reply.mediaUrl && (
                    <div className="media-container">
                      {reply.mediaType === 'image' && <img src={reply.mediaUrl} alt="reply" className="reply-gif" loading="lazy" />}
                      {reply.mediaType === 'video' && <video src={reply.mediaUrl} controls className="reply-gif" loading="lazy" />}
                    </div>
                  )}
                  {reply.gifUrl && !reply.mediaUrl && (
                    <div className="media-container">
                      <img src={reply.gifUrl} alt="reply gif" className="reply-gif" loading="lazy" />
                    </div>
                  )}
                  <div className="reply-meta">
                    <span>{reply.createdAt?.toDate ? new Date(reply.createdAt.toDate()).toLocaleString() : '...'}</span>
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
