import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import EmojiPicker from './EmojiPicker';
import SkeletonItem from './SkeletonItem';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { HiGif } from 'react-icons/hi2';

function ConfessionForm() {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emojiButtonRef = useRef(null);

  // Auto-dismiss error popup after 2.5s
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Require at least one word (not just emoji or whitespace)
    const hasWord = /[a-zA-Z0-9]/.test(text.trim());
    if (!hasWord) {
      showError('Please enter at least one word in your confession.');
      return;
    }
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
      showError('Something went wrong. Please try again.');
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className="error-message">{error}</div>}
      <form className="confession-form" onSubmit={handleSubmit}>
        <div className="textarea-wrapper">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your confession..."
            rows={4}
          />
          <div className="form-actions" style={{ 
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
                ref={emojiButtonRef}
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
                disabled={loading || (!text.trim() && !gifUrl)}
              >
                {loading ? 'Posting...' : 'Confess'}
              </button>
            </div>
          </div>
          {showEmojiPicker && (
            <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
              <div
                className="emoji-picker-modal"
                onClick={e => e.stopPropagation()}
              >
                <div className="emoji-picker-header">
                  <span className="emoji-picker-title">Select Emoji</span>
                  <button className="close-emoji-picker-modal" onClick={() => setShowEmojiPicker(false)}>
                    Done
                  </button>
                </div>
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setText(prev => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
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
        </div>
        {gifUrl && (
          <div className="gif-preview-container">
            <img src={gifUrl} alt="GIF Preview" className="gif-preview" />
            <button type="button" onClick={() => setGifUrl('')} className="remove-gif">Remove</button>
          </div>
        )}
        {loading && <SkeletonItem />}
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
    </>
  );
}

export default ConfessionForm;