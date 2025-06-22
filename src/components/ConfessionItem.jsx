import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import SkeletonItem from './SkeletonItem';
import MediaPreviewGrid from './MediaPreviewGrid';
import MediaCarouselModal from './MediaCarouselModal';
import { detectNSFW } from '../utils/detectNSFW';

const emojis = ['❤️', '😂', '😭', '😡', '👍'];

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
  const [replyMediaFiles, setReplyMediaFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [modalFiles, setModalFiles] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
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

  const openModal = (files, index) => {
    setModalFiles(files);
    setStartIndex(index);
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

  const handleReplyFileChange = async (event) => {
    const files = Array.from(event.target.files);
    await uploadReplyFiles(files);
  };

  const uploadReplyFiles = async (files) => {
    setUploadError('');
    setIsUploading(true);
    const CLOUD_NAME = 'dqptpxh4r';
    const UPLOAD_PRESET = 'ml_default';
    const newFiles = [];

    for (let file of files) {
      if (file.type.startsWith('image') && file.size > 2 * 1024 * 1024) {
        setUploadError('Image must be smaller than 2MB');
        continue;
      }
      if (file.type.startsWith('video')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = async function () {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > 60) {
            setUploadError('Video must be shorter than 60 seconds');
            return;
          }
          await uploadToCloudinary(file);
        };
        video.src = URL.createObjectURL(file);
      } else {
        await uploadToCloudinary(file);
      }
    }

    async function uploadToCloudinary(file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      try {
        const resourceType = file.type.startsWith('image') ? 'image' : 'video';
        const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
        const response = await fetch(api, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();

        let nsfw = false;
        if (resourceType === 'image') {
          nsfw = await detectNSFW(data.secure_url);
        }

        newFiles.push({ url: data.secure_url, type: resourceType, nsfw });
      } catch (err) {
        setUploadError('Upload failed.');
      }
    }

    setReplyMediaFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);
  };

  return (
    <div className={`confession-item rank-${rank || ''}`}>
      {rank && <div className="rank-badge">{getBadge()}</div>}
      <p>{confession.text}</p>

      {confession.media && confession.media.length > 0 && (
        <MediaPreviewGrid
          files={confession.media}
          onMediaClick={(index) => openModal(confession.media, index)}
        />
      )}

      {confession.gifUrl && (!confession.media || confession.media.length === 0) && (
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
            {!loading && replies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <p>{reply.text}</p>
                {reply.media && reply.media.length > 0 && (
                  <MediaPreviewGrid
                    files={reply.media}
                    onMediaClick={(index) => openModal(reply.media, index)}
                  />
                )}
                {reply.gifUrl && (!reply.media || reply.media.length === 0) && (
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

      {modalFiles.length > 0 && (
        <MediaCarouselModal
          files={modalFiles}
          startIndex={startIndex}
          onClose={() => setModalFiles([])}
        />
      )}
    </div>
  );
}

export default ConfessionItem;
