import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';

function ConfessionForm() {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const emojiButtonRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setGifUrl('');
    setMediaUrl('');
    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // <-- MUST REPLACE
    const CLOUD_NAME = 'dqptpxh4r'; // <-- MUST REPLACE

    try {
      const resourceType = file.type.startsWith('image') ? 'image' : 'video';
      const api = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

      const response = await fetch(api, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setMediaUrl(data.secure_url);
      setMediaType(resourceType);

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Upload failed. Please check your settings or try a different file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !gifUrl && !mediaUrl) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: text.trim(),
        gifUrl: gifUrl || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        createdAt: serverTimestamp(),
        reactions: {},
      });
      setText('');
      setGifUrl('');
      setMediaUrl('');
      setMediaType('');
      setUploadError('');
    } catch (err) {
      console.error("Error submitting confession:", err);
    } finally {
      setLoading(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  const removeMedia = () => {
    setMediaUrl('');
    setMediaType('');
    setUploadError('');
  };

  return (
    <form className="confession-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your confession, photo, or video..."
        rows={4}
      />
      
      {mediaUrl && (
        <div className="gif-preview-container">
          {mediaType === 'image' && <img src={mediaUrl} alt="Upload preview" className="gif-preview" />}
          {mediaType === 'video' && <video src={mediaUrl} controls className="gif-preview" />}
          <button type="button" onClick={removeMedia} className="remove-gif">×</button>
        </div>
      )}

      {gifUrl && !mediaUrl && (
        <div className="gif-preview-container">
          <img src={gifUrl} alt="Confession GIF preview" className="gif-preview"/>
          <button type="button" onClick={() => setGifUrl('')} className="remove-gif">×</button>
        </div>
      )}

      {isUploading && <div className="loading">Uploading media...</div>}
      {uploadError && <div className="error-message">{uploadError}</div>}
      
      <div className="form-actions">
        <label className="file-input-label emoji-button">
          📷 Photo/Video
          <input 
            type="file" 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
            className="file-input"
            disabled={isUploading}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setShowGifPicker(!showGifPicker);
            setUploadError('');
          }}
          className="gif-button"
        >
          Add GIF
        </button>
        <button
          type="button"
          ref={emojiButtonRef}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="emoji-button"
        >
          😊 Add Emoji
        </button>
        <button 
          type="submit" 
          disabled={loading || isUploading || (!text.trim() && !gifUrl && !mediaUrl)}
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
            />
          </div>
        )}
      </div>

      {showGifPicker && (
        <GifPicker 
          onSelect={(url) => {
            setGifUrl(url);
            removeMedia();
            setShowGifPicker(false);
          }} 
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </form>
  );
}

export default ConfessionForm;