import { useState, useRef } from 'react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import GifPicker from './GifPicker';
import SimpleEmojiPicker from './SimpleEmojiPicker';
import SkeletonItem from './SkeletonItem';
import { ContentModerationService } from '../services/contentModerationService';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { HiGif } from 'react-icons/hi2';
 
function ConfessionForm({ onOptimisticConfession }) {
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moderating, setModerating] = useState(false);
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

  // Format ban expiry date properly
  const formatBanExpiry = (expiresAt) => {
    if (!expiresAt) {
      return 'This is a permanent ban';
    }
    
    try {
      // Parse the ISO string from Cloud Functions
      const date = new Date(expiresAt);
      if (isNaN(date.getTime())) {
        return 'This ban has no expiration date';
      }
      return `This ban expires on ${date.toLocaleString()}`;
    } catch (error) {
      return 'This ban has no expiration date';
    }
  };

  // Updated function to check for meaningful content (supports all languages)
  const hasMeaningfulContent = (text) => {
    const trimmedText = text.trim();
    
    // If text is empty, return false
    if (!trimmedText) return false;
    
    // Check if text contains any letters (including international characters) or numbers
    // \p{L} matches any Unicode letter (including Chinese, Arabic, etc.)
    // \p{N} matches any Unicode number
    const meaningfulContentRegex = /[\p{L}\p{N}]/u;
    
    return meaningfulContentRegex.test(trimmedText);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if over character limit
    if (isOverLimit) {
      showError(`Please keep your confession under ${MAX_CHARACTERS} characters. Current: ${characterCount} characters.`);
      return;
    }
    
    // FOR CONFESSIONS: Require meaningful text content, GIF alone is not enough
    if (!hasMeaningfulContent(text)) {
      showError('Confessions must contain meaningful text content, not just emojis, symbols, or GIFs.');
      return;
    }
    
    // Create optimistic confession for immediate UI feedback
    setLoading(true);
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
    
    // Immediately create the confession document (optimistic write). We'll update moderation metadata later.
    let docRef = null;
    try {
      const docData = {
        text: submittedText,
        gifUrl: submittedGifUrl || null,
        createdAt: serverTimestamp(),
        reactions: {},
        replyCount: 0,
        // moderation placeholders - will be updated asynchronously
        moderated: false,
        moderatedAt: null,
        isNSFW: false,
        moderationIssues: []
      };

      const cleanUndefined = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
          if (value === undefined) {
            obj[key] = null;
          } else if (value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
            cleanUndefined(value);
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (item === undefined) {
                value[index] = null;
              } else if (item && typeof item === 'object') {
                cleanUndefined(item);
              }
            });
          }
        }
      };

      cleanUndefined(docData);

      docRef = await addDoc(collection(db, 'confessions'), docData);

      // Fire-and-forget: log IP (non-blocking)
      (async () => {
        try {
          const logConfessionIp = httpsCallable(functions, 'logConfessionIp');
          await logConfessionIp({ confessionId: docRef.id });
        } catch (ipError) {
          console.warn('IP logging failed (non-critical):', ipError.message);
        }
      })();

      // Now run ban check and moderation in parallel, but don't block the UI.
      (async () => {
        try {
          const checkConfessionBan = httpsCallable(functions, 'checkConfessionBan');
          const banPromise = checkConfessionBan().catch(err => ({ error: err }));
          const moderationPromise = ContentModerationService.moderateContent(submittedText, 'confession').catch(err => ({ error: err }));

          const [banResult, moderationResult] = await Promise.all([banPromise, moderationPromise]);

          // If ban result exists and indicates banned, remove the confession and notify user
          if (banResult && !banResult.error && banResult.data && banResult.data.isBanned) {
            // Remove the created confession using Cloud Function
            try {
              const deleteConfession = httpsCallable(functions, 'deleteConfession');
              await deleteConfession({ confessionId: docRef.id });
            } catch (delErr) {
              console.error('Failed to delete banned confession:', delErr);
            }
            // Inform user (non-blocking UI update)
            showError(`❌ Your IP address has been banned from posting confessions. Reason: ${banResult.data.reason}. ${formatBanExpiry(banResult.data.expiresAt)}`);
            // Remove optimistic confession from parent
            if (onOptimisticConfession) {
              onOptimisticConfession(null, true);
            }
            return;
          }

          // If moderation returned a valid result, update the confession document with moderation metadata
          if (moderationResult && !moderationResult.error && moderationResult.isNSFW !== undefined) {
            try {
              const update = {
                moderated: true,
                moderatedAt: serverTimestamp(),
                isNSFW: moderationResult.isNSFW || false,
                moderationIssues: moderationResult.issues || []
              };
              // Update moderation status using Cloud Function
              const updateModerationStatus = httpsCallable(functions, 'updateConfessionModeration');
              await updateModerationStatus({
                confessionId: docRef.id,
                isNSFW: moderationResult.isNSFW || false,
                issues: moderationResult.issues || []
              });
            } catch (updateErr) {
              console.error('Failed to update moderation metadata:', updateErr);
            }
          }
        } catch (bgErr) {
          console.error('Background ban/moderation check failed:', bgErr);
        }
      })();

    } catch (err) {
      showError('Something went wrong. Please try again.');
      console.error("Error creating confession:", err);

      // Restore form data on error
      setText(submittedText);
      setGifUrl(submittedGifUrl);

      // Remove optimistic confession on error
      if (onOptimisticConfession) {
        onOptimisticConfession(null, true); // Pass error flag
      }
    } finally {
      setLoading(false);
      setModerating(false);
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
            disabled={loading || moderating}
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
            {moderating && <span style={{ color: '#ffc107', marginLeft: '0.5rem' }}>🔍 Checking...</span>}
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
                disabled={loading || moderating}
              >
                <HiGif size={24} />
              </button>
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="action-button emoji-action"
                aria-label="Add emoji"
                disabled={loading || moderating}
              >
                <MdOutlineEmojiEmotions size={24} />
              </button>
            </div>
            <div className="right-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={loading || moderating || !hasMeaningfulContent(text) || isOverLimit}
                style={{
                  opacity: (isOverLimit || moderating) ? 0.5 : 1,
                  cursor: (isOverLimit || moderating) ? 'not-allowed' : 'pointer'
                }}
              >
                {moderating ? 'Checking...' : loading ? 'Posting...' : 'Confess'}
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
              disabled={loading || moderating}
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