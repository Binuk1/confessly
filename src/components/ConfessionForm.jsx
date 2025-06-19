// src/components/ConfessionForm.jsx
import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker'; // Keep this for Giphy
import EmojiPicker from 'emoji-picker-react';
import FileUploadButton from './FileUploadButton'; // Import the new component

function ConfessionForm() {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState(''); // State for Giphy GIF
  const [mediaUrl, setMediaUrl] = useState(''); // State for Cloudinary uploaded media
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const emojiButtonRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !gifUrl && !mediaUrl) return; // Check all media types
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: text.trim(),
        gifUrl: gifUrl || null,    // Store GIF URL if present
        mediaUrl: mediaUrl || null, // Store uploaded media URL if present
        createdAt: serverTimestamp(),
        reactions: {},
      });
      setText('');
      setGifUrl('');
      setMediaUrl(''); // Reset Cloudinary media URL
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

  const handleGifSelect = (url) => {
    setGifUrl(url);
    setMediaUrl(''); // Clear Cloudinary media if a GIF is selected
    setShowGifPicker(false);
  };

  const handleUploadSuccess = (url) => {
    setMediaUrl(url); // Set the uploaded Cloudinary URL
    setGifUrl(''); // Clear GIF if a file is uploaded
  };

  return (
    <form className="confession-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your confession..."
        rows={4}
      />
      
      {/* Display media preview - prioritize uploaded media, then GIF */}
      {(mediaUrl || gifUrl) && (
        <div className="gif-preview-container"> {/* Reusing GIF preview class, consider renaming */}
          {mediaUrl ? (
            // Check if it's an image or video
            mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
              <img 
                src={mediaUrl} 
                alt="Confession photo/video preview" 
                className="gif-preview"
              />
            ) : (
              <video 
                src={mediaUrl} 
                alt="Confession photo/video preview" 
                className="gif-preview" 
                controls
              />
            )
          ) : ( // Else, display GIF if mediaUrl is empty
            <img 
              src={gifUrl} 
              alt="Confession GIF preview" 
              className="gif-preview"
            />
          )}
          <button 
            type="button" 
            onClick={() => { setGifUrl(''); setMediaUrl(''); }} // Clear both
            className="remove-gif"
          >
            ×
          </button>
        </div>
      )}

      <div className="form-actions">
        {/* Button for Cloudinary File Upload */}
        <FileUploadButton 
          onUploadSuccess={handleUploadSuccess} 
          buttonText="Upload Photo/Video"
        />
        {/* Button for Giphy GIF Picker */}
        <button
          type="button"
          onClick={() => setShowGifPicker(!showGifPicker)}
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
          disabled={loading || (!text.trim() && !gifUrl && !mediaUrl)}
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
          onSelect={handleGifSelect} 
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </form>
  );
}

export default ConfessionForm;