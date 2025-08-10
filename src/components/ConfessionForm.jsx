import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import GifPicker from './GifPicker';
import SimpleEmojiPicker from './SimpleEmojiPicker';
import SkeletonItem from './SkeletonItem';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { HiGif } from 'react-icons/hi2';

function ConfessionForm({ onOptimisticConfession }) {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emojiButtonRef = useRef(null);

  const MAX_CHARACTERS = 3500;

  // Count characters in text (emojis count as 1 character)
  const getCharacterCount = (text) => {
    // Use Array.from to properly count Unicode characters (emojis as 1 char)
    return Array.from(text).length;
  };

  const characterCount = getCharacterCount(text);
  const isOverLimit = characterCount > MAX_CHARACTERS;

  // Auto-dismiss error popup after 2.5s
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 2500);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if over character limit
    if (isOverLimit) {
      showError(`Please keep your confession under ${MAX_CHARACTERS} characters. Current: ${characterCount} characters.`);
      return;
    }
    
    // Require at least one alphanumeric character (confessions MUST have words)
    const hasContent = /[a-zA-Z0-9]/.test(text.trim());
    if (!hasContent) {
      showError('Confessions must contain at least some text, not just emojis or GIFs.');
      return;
    }
    
    setLoading(true);
    
    // Create optimistic confession for immediate UI feedback
    const optimisticConfession = {
      id: `temp-${Date.now()}`,
      text: text.trim(),
      gifUrl: gifUrl || null,
      createdAt: new Date(),
      reactions: {},
      replyCount: 0,
      totalReactions: 0,
      isOptimistic: true
    };
    
    // Store form data before clearing
    const submittedText = text.trim();
    const submittedGifUrl = gifUrl;
    
    // Clear form immediately for better UX
    setText('');
    setGifUrl('');
    setShowGifPicker(false);
    setShowEmojiPicker(false);
    
    // Send optimistic confession to parent component
    if (onOptimisticConfession) {
      onOptimisticConfession(optimisticConfession);
    }
    
    try {
      await addDoc(collection(db, 'confessions'), {
        text: submittedText,
        gifUrl: submittedGifUrl || null,
        createdAt: serverTimestamp(),
        reactions: {},
        replyCount: 0,
      });
      
      // Success! The real confession will come through the Firestore listener
      
    } catch (err) {
      showError('Something went wrong. Please try again.');
      console.error("Error:", err);
      
      // Restore form data on error
      setText(submittedText);
      setGifUrl(submittedGifUrl);
      
      // Remove optimistic confession on error
      if (onOptimisticConfession) {
        onOptimisticConfession(null, true); // Pass error flag
      }
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
            onChange={handleTextChange}
            placeholder="Share your confession..."
            rows={4}
            style={{ resize: 'none' }} // Disable resize
            disabled={loading}
          />
          
          {/* Character counter */}
          <div className="word-counter" style={{
            fontSize: '0.8rem',
            color: isOverLimit ? '#e74c3c' : '#666',
            textAlign: 'right',
            marginTop: '0.25rem',
            fontWeight: isOverLimit ? 'bold' : 'normal'
          }}>
            {characterCount}/{MAX_CHARACTERS} characters
            {isOverLimit && <span style={{ color: '#e74c3c', marginLeft: '0.5rem' }}>⚠️ Over limit</span>}
          </div>

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
                disabled={loading}
              >
                <HiGif size={24} />
              </button>
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="action-button emoji-action"
                aria-label="Add emoji"
                disabled={loading}
              >
                <MdOutlineEmojiEmotions size={24} />
              </button>
            </div>
            <div className="right-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={loading || (!text.trim() && !gifUrl) || isOverLimit}
                style={{
                  opacity: isOverLimit ? 0.5 : 1,
                  cursor: isOverLimit ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Posting...' : 'Confess'}
              </button>
            </div>
          </div>
          {showEmojiPicker && (
            <SimpleEmojiPicker
              onEmojiClick={(emojiData) => {
                setText(prev => prev + emojiData.emoji);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
        {gifUrl && (
          <div className="gif-preview-container">
            <img src={gifUrl} alt="GIF Preview" className="gif-preview" />
            <button 
              type="button" 
              onClick={() => setGifUrl('')} 
              className="remove-gif"
              disabled={loading}
            >
              Remove
            </button>
          </div>
        )}
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