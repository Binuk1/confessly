import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import SkeletonItem from './SkeletonItem';
import MediaPreviewGrid from './MediaPreviewGrid';
import { detectNSFW } from '../utils/detectNSFW';

function ConfessionForm() {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const emojiButtonRef = useRef(null);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
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

        const isNSFW = file.type.startsWith('image') ? await detectNSFW(data.secure_url) : false;

        newFiles.push({ url: data.secure_url, type: resourceType, nsfw: isNSFW });
      } catch (error) {
        setUploadError(error.message || 'Upload failed');
      }
    }

    setMediaFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !gifUrl && mediaFiles.length === 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: text.trim(),
        gifUrl: gifUrl || null,
        media: mediaFiles,
        createdAt: serverTimestamp(),
        reactions: {},
      });
      setText('');
      setGifUrl('');
      setMediaFiles([]);
      setUploadError('');
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form className="confession-form" onSubmit={handleSubmit}>
      <div
        className={`textarea-wrapper ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          uploadFiles(files);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your confession, photo, or video..."
          rows={4}
        />
        <div className="form-actions">
          <label className="file-input-label">
            📷
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setShowGifPicker(!showGifPicker);
              setUploadError('');
            }}
            className="action-button"
          >
            GIF
          </button>

          <button
            type="button"
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="action-button"
          >
            😊
          </button>

          <button
            type="button"
            className="action-button"
            title="Max image: 2MB, Max video: 60s"
            onClick={() => alert('Max image size: 2MB\nMax video length: 60 seconds')}
          >
            ℹ️
          </button>

          <button
            type="submit"
            className="submit-button"
            disabled={loading || isUploading || (!text.trim() && !gifUrl && mediaFiles.length === 0)}
          >
            {loading ? 'Posting...' : 'Confess'}
          </button>

          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setText(prev => prev + emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                width={300}
                height={400}
                previewConfig={{ showPreview: false }}
                searchPlaceholder="Search emojis..."
              />
            </div>
          )}
        </div>
      </div>

      {mediaFiles.length > 0 && (
        <MediaPreviewGrid files={mediaFiles} removable onRemove={removeMedia} />
      )}

      {(isUploading || loading) && <SkeletonItem />}
      {uploadError && <div className="error-message">{uploadError}</div>}

      {showGifPicker && (
        <GifPicker
          onSelect={(url) => {
            setGifUrl(url);
            setMediaFiles([]);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </form>
  );
}

export default ConfessionForm;
