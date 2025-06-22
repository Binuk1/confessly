import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import SkeletonItem from './SkeletonItem'; // ADDED

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
  const [replyMediaUrl, setReplyMediaUrl] = useState('');
  const [replyMediaType, setReplyMediaType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(`reaction-${confession.id}`);
    if (stored) setSelectedEmoji(stored);
  }, [confession.id]);

  useEffect(() => {
    const repliesRef = collection(db, 'confessions', confession.id, 'replies');
    const unsubscribeCount = onSnapshot(repliesRef, (snapshot) => {
      setReplyCount(snapshot.size);
    });
    return () => unsubscribeCount();
  }, [confession.id]);

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
        setError("Failed to load replies.");
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
    }
  };

  const handleReplyFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setReplyGifUrl('');
    setReplyMediaUrl('');
    setUploadError('');
    setIsUploading(true);

    if (file.type.startsWith('image') && file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be smaller than 2MB');
      setIsUploading(false);
      return;
    }

    if (file.type.startsWith('video')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function () {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 60) {
          setUploadError('Video must be shorter than 60 seconds');
          setIsUploading(false);
          return;
        }
        proceedUpload(file);
      };
      video.src = URL.createObjectURL(file);
    } else {
      proceedUpload(file);
    }
  };

  const proceedUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // replace
    const CLOUD_NAME = 'dqptpxh4r'; // replace

    try {
      const resourceType = file.type.startsWith('image') ? 'image' : 'video';
      const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

      const response = await fetch(api, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Cloudinary upload failed: ${response.status}`);

      const data = await response.json();
      setReplyMediaUrl(data.secure_url);
      setReplyMediaType(resourceType);
    } catch (err) {
      setUploadError('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyGifUrl && !replyMediaUrl) return;

    setLoading(true);
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
    } catch (err) {
      console.error("Reply error:", err);
      setError("Failed to post reply.");
    } finally {
      setLoading(false);
    }
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
          {confession.mediaType === 'image' ? (
            <img src={confession.mediaUrl} alt="Confession media" className="confession-media" loading="lazy" />
          ) : (
            <video src={confession.mediaUrl} controls className="confession-media" loading="lazy" />
          )}
        </div>
      )}
      {confession.gifUrl && !confession.mediaUrl && (
        <div className="media-container">
          <img src={confession.gifUrl} alt="Confession GIF" className="confession-gif" loading="lazy" />
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
              <div
                className={`textarea-wrapper reply-wrapper ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleReplyFileChange({ target: { files: [file] } });
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  disabled={loading || isUploading}
                />
                <div className="reply-actions">
                  <label className="file-input-label">
                    📷
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleReplyFileChange}
                      disabled={isUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className="action-button">GIF</button>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="action-button">😊</button>
                  <button
                    type="button"
                    onClick={() => alert('Max image size: 2MB\nMax video length: 60 seconds')}
                    className="action-button"
                    title="Max image: 2MB, Max video: 60s"
                  >
                    ℹ️
                  </button>
                  {/* UPDATED: Reply button */}
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading || isUploading || (!replyText.trim() && !replyGifUrl && !replyMediaUrl)}
                  >
                    {(loading || isUploading) ? 'Posting...' : 'Reply'}
                  </button>

                  {showEmojiPicker && (
                    <div className="emoji-picker-container upwards" ref={emojiPickerRef}>
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          setReplyText(prev => prev + emojiData.emoji);
                          textareaRef.current.focus();
                        }}
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
              </div>
            </form>

            {replyMediaUrl && (
              <div className="gif-preview-container">
                {replyMediaType === 'image' ? (
                  <img src={replyMediaUrl} alt="Reply preview" className="gif-preview" />
                ) : (
                  <video src={replyMediaUrl} controls className="gif-preview" />
                )}
                <button type="button" onClick={() => { setReplyMediaUrl(''); setUploadError(''); }} className="remove-gif">×</button>
              </div>
            )}
            {replyGifUrl && !replyMediaUrl && (
              <div className="gif-preview-container">
                <img src={replyGifUrl} alt="Reply GIF preview" className="gif-preview" />
                <button type="button" onClick={() => setReplyGifUrl('')} className="remove-gif">×</button>
              </div>
            )}

            {/* UPDATED: Reply upload loader */}
            {isUploading && <SkeletonItem />}
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

            {/* UPDATED: Reply list loader */}
            {loading && replies.length === 0 && <SkeletonItem />}

            {!loading && replies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <p>{reply.text}</p>
                {reply.mediaUrl && (
                  <div className="media-container">
                    {reply.mediaType === 'image' ? (
                      <img src={reply.mediaUrl} alt="Reply media" className="reply-gif" loading="lazy" />
                    ) : (
                      <video src={reply.mediaUrl} controls className="reply-gif" loading="lazy" />
                    )}
                  </div>
                )}
                {reply.gifUrl && !reply.mediaUrl && (
                  <div className="media-container">
                    <img src={reply.gifUrl} alt="Reply GIF" className="reply-gif" loading="lazy" />
                  </div>
                )}
                <div className="reply-meta">
                  <span>{new Date(reply.createdAt?.toDate()).toLocaleString()}</span>
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