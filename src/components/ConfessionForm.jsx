import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import EmojiPicker from 'emoji-picker-react';

function ConfessionForm() {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const emojiButtonRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !gifUrl) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        text: text.trim(),
        gifUrl: gifUrl || null,
        createdAt: serverTimestamp(),
        reactions: {},
      });
      setText('');
      setGifUrl('');
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

  return (
    <form className="confession-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your confession..."
        rows={4}
      />
      
      {gifUrl && (
        <div className="gif-preview-container">
          <img 
            src={gifUrl} 
            alt="Confession GIF preview" 
            className="gif-preview"
          />
          <button 
            type="button" 
            onClick={() => setGifUrl('')}
            className="remove-gif"
          >
            ×
          </button>
        </div>
      )}

      <div className="form-actions">
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
          disabled={loading || (!text.trim() && !gifUrl)}
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
            setShowGifPicker(false);
          }} 
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </form>
  );
}

export default ConfessionForm;