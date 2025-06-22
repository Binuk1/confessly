// ✅ FINAL ConfessionItem.jsx update
// Uncropped media preview + Bootstrap modal viewer for both confessions AND replies
import { useState, useEffect, useRef } from 'react';
import {
  doc, updateDoc, collection, query, onSnapshot,
  orderBy, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import SkeletonItem from './SkeletonItem';

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
  const [replyMediaFiles, setReplyMediaFiles] = useState([]); // [{ url, type }]
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [modalMedia, setModalMedia] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
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
    const unsubscribeReplies = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
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

  const openMediaModal = (mediaList, index) => {
    setModalMedia(mediaList);
    setModalIndex(index);
    setShowModal(true);
  };

  const imageMedia = confession.media?.filter(m => m.type === 'image') || [];
  const videoMedia = confession.media?.find(m => m.type === 'video');

  const handleReplyFileUpload = async (file) => {
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
    formData.append('upload_preset', 'ml_default');
    const CLOUD_NAME = 'dqptpxh4r';

    try {
      const resourceType = file.type.startsWith('image') ? 'image' : 'video';
      const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
      const res = await fetch(api, { method: 'POST', body: formData });
      const data = await res.json();
      setReplyMediaFiles(prev => [...prev, { url: data.secure_url, type: resourceType }]);
    } catch (e) {
      setUploadError('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !replyGifUrl && replyMediaFiles.length === 0) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions', confession.id, 'replies'), {
        text: replyText.trim(),
        gifUrl: replyGifUrl || null,
        media: replyMediaFiles,
        createdAt: serverTimestamp(),
      });
      setReplyText('');
      setReplyGifUrl('');
      setReplyMediaFiles([]);
    } catch (err) {
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

      {/* Image grid */}
      {imageMedia.length > 0 && (
        <div className="media-grid">
          {imageMedia.slice(0, 5).map((img, i) => (
            <div key={i} className="media-grid-item" onClick={() => openMediaModal(imageMedia, i)}>
              <img src={img.url} className="confession-media" alt="conf-img" />
              {i === 4 && imageMedia.length > 5 && (
                <div className="media-overlay">+{imageMedia.length - 5}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {videoMedia && (
        <div className="media-container">
          <video src={videoMedia.url} controls className="confession-media" />
        </div>
      )}

      <div className="reaction-bar">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className={selectedEmoji === emoji ? 'selected' : ''}
            onClick={() => toggleReaction(emoji)}
            disabled={loading}
          >
            {emoji} {confession.reactions?.[emoji] || 0}
          </button>
        ))}
      </div>

      <div className="reply-section">
        <button onClick={() => setShowReplies(!showReplies)} className="toggle-replies-btn">
          {showReplies ? 'Hide Replies' : `Show Replies (${replyCount})`}
        </button>
        {showReplies && (
          <div className="replies-container">
            <form onSubmit={handleReplySubmit} className="reply-form">
              <div className="textarea-wrapper reply-wrapper">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                />
                <div className="reply-actions">
                  <label className="file-input-label">📷
                    <input
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleReplyFileUpload(e.target.files[0])}
                    />
                  </label>
                  <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className="action-button">GIF</button>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="action-button">😊</button>
                  <button type="submit" className="submit-button" disabled={loading || isUploading || (!replyText.trim() && !replyGifUrl && replyMediaFiles.length === 0)}>
                    {(loading || isUploading) ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>

            {/* Reply preview media */}
            {replyMediaFiles.length > 0 && (
              <div className="media-previews">
                {replyMediaFiles.map((file, idx) => (
                  <div key={idx} className="gif-preview-container">
                    {file.type === 'image' ? (
                      <img src={file.url} alt="Reply Preview" className="gif-preview" style={{ objectFit: 'contain' }} />
                    ) : (
                      <video src={file.url} controls className="gif-preview" style={{ objectFit: 'contain' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {replies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <p>{reply.text}</p>
                {reply.media?.length > 0 && (
                  <div className="media-grid">
                    {reply.media.map((m, i) => (
                      <div
                        key={i}
                        className="media-grid-item"
                        onClick={() => openMediaModal(reply.media, i)}
                      >
                        {m.type === 'image' ? (
                          <img src={m.url} alt="Reply img" className="reply-gif" />
                        ) : (
                          <video src={m.url} className="reply-gif" controls />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-body p-0 text-center">
                {modalMedia[modalIndex]?.type === 'image' ? (
                  <img src={modalMedia[modalIndex].url} className="img-fluid w-100" />
                ) : (
                  <video src={modalMedia[modalIndex].url} controls className="w-100" />
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <div>
                  <button className="btn btn-light me-2" disabled={modalIndex === 0} onClick={() => setModalIndex(modalIndex - 1)}>Prev</button>
                  <button className="btn btn-light" disabled={modalIndex === modalMedia.length - 1} onClick={() => setModalIndex(modalIndex + 1)}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfessionItem;
