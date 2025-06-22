import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';
import SkeletonItem from './SkeletonItem';

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
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    handleFiles(files);
  };

  const handleFileUpload = async (file) => {
    if (file.type.startsWith('image') && file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be smaller than 2MB');
      return false;
    }

    if (file.type.startsWith('video')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function () {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 60) {
          setUploadError('Video must be shorter than 60 seconds');
          return false;
        }
        return proceedWithUpload(file);
      };
      video.src = URL.createObjectURL(file);
      return true;
    } else {
      return proceedWithUpload(file);
    }
  };

  const proceedWithUpload = async (file) => {
    setGifUrl('');
    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');
    const CLOUD_NAME = 'dqptpxh4r';

    try {
      const resourceType = file.type.startsWith('image') ? 'image' : 'video';
      const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

      const response = await fetch(api, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      
      const data = await response.json();
      setMediaFiles(prev => [...prev, { url: data.secure_url, type: resourceType }]);
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload failed.');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = async (files) => {
    const filesArray = Array.from(files).slice(0, 10 - mediaFiles.length);
    if (filesArray.length === 0) {
      setUploadError('Maximum 10 files allowed');
      return;
    }

    for (const file of filesArray) {
      await handleFileUpload(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !gifUrl && mediaFiles.length === 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: text.trim(),
        gifUrl: gifUrl || null,
        media: mediaFiles.length > 0 ? mediaFiles : null,
        mediaUrl: mediaFiles.length === 1 ? mediaFiles[0].url : null,
        mediaType: mediaFiles.length === 1 ? mediaFiles[0].type : null,
        createdAt: serverTimestamp(),
        reactions: {},
        nsfw: false,
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
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeGif = () => {
    setGifUrl('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <form 
      className={`confession-form ${dragOver ? 'drag-over' : ''}`}
      onSubmit={handleSubmit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="textarea-wrapper">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your confession, photo, or video..."
          rows={4}
        />
        <div className="form-actions">
          <label className="file-input-label" htmlFor="confession-upload">
            📷
            <input
              ref={fileInputRef}
              id="confession-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
              multiple
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setShowGifPicker(!showGifPicker);
              setUploadError('');
            }}
            className="action-button"
            aria-label="Add GIF"
          >
            GIF
          </button>

          <button
            type="button"
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="action-button"
            aria-label="Add Emoji"
          >
            😊
          </button>

          <button
            type="button"
            className="action-button"
            title="Max image: 2MB, Max video: 60s"
            onClick={() => alert('Max image size: 2MB\nMax video length: 60 seconds\nMax files: 10')}
            aria-label="Upload guidelines"
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
                onEmojiClick={onEmojiClick}
                width={300}
                height={400}
                previewConfig={{ showPreview: false }}
                searchPlaceholder="Search emojis..."
                autoFocusSearch={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Media previews - uncropped */}
      <div className="media-previews">
        {mediaFiles.map((file, index) => (
          <div key={index} className="gif-preview-container">
            {file.type === 'image' ? (
              <img 
                src={file.url} 
                alt={`Preview ${index}`} 
                className="gif-preview" 
                style={{ objectFit: 'contain' }} 
              />
            ) : (
              <video 
                src={file.url} 
                controls 
                className="gif-preview" 
                style={{ objectFit: 'contain' }} 
              />
            )}
            <button 
              type="button" 
              onClick={() => removeMedia(index)} 
              className="remove-gif"
              aria-label="Remove media"
            >
              ×
            </button>
          </div>
        ))}

        {gifUrl && !mediaFiles.length && (
          <div className="gif-preview-container">
            <img 
              src={gifUrl} 
              alt="GIF Preview" 
              className="gif-preview" 
              style={{ objectFit: 'contain' }} 
            />
            <button 
              type="button" 
              onClick={removeGif} 
              className="remove-gif"
              aria-label="Remove GIF"
            >
              ×
            </button>
          </div>
        )}
      </div>

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