import { useState, useEffect, useRef, memo } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import SkeletonItem from './SkeletonItem';
import GifPicker from './GifPicker';
import SimpleEmojiPicker from './SimpleEmojiPicker';
import ReportButton from './ReportButton';
import ReactionBar from './ReactionBar';
import { ContentModerationService } from '../services/contentModerationService';
import { subscribeToReactions, toggleReaction, removePreviousReaction, getUserReaction } from '../services/reactionService';
import { HiGif } from 'react-icons/hi2';
import { MdOutlineEmojiEmotions } from 'react-icons/md';
import { TbCircleNumber1Filled, TbCircleNumber2Filled, TbCircleNumber3Filled, TbCircleNumber4Filled, TbCircleNumber5Filled } from 'react-icons/tb';
import './ConfessionItem.css';

function ConfessionItem({ confession, rank, onOpenSettings }) {
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [localReactions, setLocalReactions] = useState(confession.reactions || {});
  const [loading, setLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(confession.replyCount || 0);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyGifUrl, setReplyGifUrl] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showFullText, setShowFullText] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [submittingReply, setSubmittingReply] = useState(false);
  const [moderatingReply, setModeratingReply] = useState(false);
  const [optimisticReply, setOptimisticReply] = useState(null);
  const [nsfwFilter, setNsfwFilter] = useState(true);
  const [showNsfwContent, setShowNsfwContent] = useState(false);
  const [showNsfwReplies, setShowNsfwReplies] = useState(new Set());
  
  // Load NSFW filter setting from localStorage
  useEffect(() => {
    const savedFilter = localStorage.getItem('nsfwFilter');
    if (savedFilter !== null) {
      setNsfwFilter(JSON.parse(savedFilter));
    }
  }, []);

  // Listen for localStorage changes (when settings are updated in another component)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedFilter = localStorage.getItem('nsfwFilter');
      if (savedFilter !== null) {
        setNsfwFilter(JSON.parse(savedFilter));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper function to check if content should be blurred
  const shouldBlurContent = (isNSFW) => {
    return nsfwFilter && isNSFW;
  };

  // Helper function to toggle NSFW content visibility
  const toggleNsfwContent = () => {
    setShowNsfwContent(!showNsfwContent);
  };

  // Helper function to toggle NSFW reply visibility
  const toggleNsfwReply = (replyId) => {
    setShowNsfwReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };
  
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Real-time reaction listener
  useEffect(() => {
    const unsubscribe = subscribeToReactions(confession.id, (reactions) => {
      setLocalReactions(reactions);
    });

    // Get user's current reaction
    getUserReaction(confession.id).then((userReaction) => {
      setSelectedEmoji(userReaction);
    });

    return unsubscribe;
  }, [confession.id]);

  const TRUNCATE_LIMIT = 200;
  const shouldTruncate = confession.text.length > TRUNCATE_LIMIT;
  const displayText = shouldTruncate && !showFullText 
    ? confession.text.substring(0, TRUNCATE_LIMIT) + '...'
    : confession.text;

  // Helper function to check if reply should be truncated
  const shouldTruncateReply = (text) => text && text.length > TRUNCATE_LIMIT;
  
  // Helper function to get display text for reply
  const getReplyDisplayText = (reply) => {
    if (!reply.text) return '';
    const shouldTruncate = shouldTruncateReply(reply.text);
    const isExpanded = expandedReplies.has(reply.id);
    return shouldTruncate && !isExpanded 
      ? reply.text.substring(0, TRUNCATE_LIMIT) + '...'
      : reply.text;
  };

  // Helper function to toggle reply expansion
  const toggleReplyExpansion = (replyId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  // Auto-dismiss error popup after 3s
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  function getBadge() {
    const badgeStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      marginBottom: '0.8rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      transform: 'scale(1)',
    };

    switch (rank) {
      case 1: 
        return (
          <div style={{
            ...badgeStyle,
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: '2px solid #FF8C00'
          }}>
            <TbCircleNumber1Filled size={24} color="#8B4513" />
          </div>
        );
      case 2: 
        return (
          <div style={{
            ...badgeStyle,
            background: 'linear-gradient(135deg, #C0C0C0, #A9A9A9)',
            border: '2px solid #696969'
          }}>
            <TbCircleNumber2Filled size={22} color="#2F4F4F" />
          </div>
        );
      case 3: 
        return (
          <div style={{
            ...badgeStyle,
            background: 'linear-gradient(135deg, #CD7F32, #B8860B)',
            border: '2px solid #8B6914'
          }}>
            <TbCircleNumber3Filled size={20} color="#654321" />
          </div>
        );
      case 4:
        return (
          <div style={{
            ...badgeStyle,
            background: 'linear-gradient(135deg, #87CEEB, #4682B4)',
            border: '2px solid #4169E1'
          }}>
            <TbCircleNumber4Filled size={18} color="#1E3A8A" />
          </div>
        );
      case 5: 
        return (
          <div style={{
            ...badgeStyle,
            background: 'linear-gradient(135deg, #98FB98, #32CD32)',
            border: '2px solid #228B22'
          }}>
            <TbCircleNumber5Filled size={16} color="#006400" />
          </div>
        );
      default: 
        return null;
    }
  }

  // Listen for replies when replies are shown
  useEffect(() => {
    if (!showReplies) {
      setReplies([]);
      setOptimisticReply(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const repliesQuery = query(
        collection(db, 'replies'),
        where('confessionId', '==', confession.id)
      );

      const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
        try {
          const repliesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort in memory by createdAt (ascending - oldest first)
          const sortedReplies = repliesData.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt.toDate() - b.createdAt.toDate();
          });
          
          setReplies(sortedReplies);
          setReplyCount(sortedReplies.length);
          setLoading(false);

          // Clear optimistic reply once we get the real data
          if (optimisticReply && sortedReplies.some(reply => 
            reply.text === optimisticReply.text && reply.gifUrl === optimisticReply.gifUrl
          )) {
            setOptimisticReply(null);
          }
        } catch (err) {
          console.error("Error processing replies:", err);
          setLoading(false);
        }
      }, (err) => {
        console.error("Error fetching replies:", err);
        if (err.code === 'permission-denied') {
          showError("Unable to load replies. Please try again later.");
        } else if (err.code === 'unavailable') {
          showError("Network error. Please check your connection.");
        }
        setReplies([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up replies listener:", err);
      setReplies([]);
      setLoading(false);
    }
  }, [showReplies, confession.id, optimisticReply]);

  async function handleReactionToggle(emoji) {
    const previousEmoji = selectedEmoji;
    
    // Optimistic UI update - instant feedback
    if (selectedEmoji === emoji) {
      // Removing current reaction
      setSelectedEmoji(null);
      setLocalReactions(prev => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] || 0) - 1)
      }));
    } else {
      // Adding new reaction
      setSelectedEmoji(emoji);
      setLocalReactions(prev => {
        const newReactions = { ...prev };
        // Remove count from previous emoji if exists
        if (previousEmoji) {
          newReactions[previousEmoji] = Math.max(0, (newReactions[previousEmoji] || 0) - 1);
        }
        // Add count to new emoji
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        return newReactions;
      });
    }
    
    // Background server update - don't await, handle errors gracefully
    try {
      if (selectedEmoji === emoji) {
        // Was removing reaction
        toggleReaction(confession.id, emoji).catch(err => {
          console.error("Error removing reaction:", err);
          // Revert optimistic update on error
          setSelectedEmoji(emoji);
          setLocalReactions(prev => ({
            ...prev,
            [emoji]: (prev[emoji] || 0) + 1
          }));
        });
      } else {
        // Was adding new reaction
        const promises = [];
        if (previousEmoji) {
          promises.push(removePreviousReaction(confession.id, emoji));
        }
        promises.push(toggleReaction(confession.id, emoji));
        
        Promise.all(promises).catch(err => {
          console.error("Error updating reaction:", err);
          // Revert optimistic update on error
          setSelectedEmoji(previousEmoji);
          setLocalReactions(prev => {
            const revertedReactions = { ...prev };
            // Revert new emoji
            revertedReactions[emoji] = Math.max(0, (revertedReactions[emoji] || 0) - 1);
            // Restore previous emoji if it existed
            if (previousEmoji) {
              revertedReactions[previousEmoji] = (revertedReactions[previousEmoji] || 0) + 1;
            }
            return revertedReactions;
          });
        });
      }
    } catch (err) {
      console.error("Error in reaction handler:", err);
    }
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    
    // For replies: allow GIF-only or emoji-only, but require SOME content
    const hasText = replyText.trim().length > 0;
    const hasGif = replyGifUrl && replyGifUrl.trim().length > 0;
    
    if (!hasText && !hasGif) {
      showError('Please enter some text or add a GIF to your reply.');
      return;
    }

    // CONTENT MODERATION - Check reply text and store moderation result
    let replyModerationResult = null;
    if (hasText) {
      setModeratingReply(true);
      try {
        replyModerationResult = await ContentModerationService.moderateContent(replyText.trim(), 'reply');
      } catch (moderationError) {
        console.error('Reply moderation failed:', moderationError);
        // Continue with submission if moderation service fails (fail open approach)
      } finally {
        setModeratingReply(false);
      }
    }

    setSubmittingReply(true);
    
    // Create optimistic reply for immediate UI feedback
    const tempReply = {
      id: `temp-${Date.now()}`,
      confessionId: confession.id,
      text: replyText.trim(),
      gifUrl: replyGifUrl || null,
      createdAt: new Date(),
      isOptimistic: true
    };
    
    setOptimisticReply(tempReply);
    
    // Store form data before clearing
    const submittedText = replyText.trim();
    const submittedGifUrl = replyGifUrl;
    
    // Clear form immediately for better UX
    setReplyText('');
    setReplyGifUrl('');
    setShowGifPicker(false);
    setShowEmojiPicker(false);

    try {
      // Add reply to replies collection
      await addDoc(collection(db, 'replies'), {
        confessionId: confession.id,
        text: submittedText,
        gifUrl: submittedGifUrl || null,
        createdAt: serverTimestamp(),
        // Store moderation metadata
        moderated: true,
        moderatedAt: serverTimestamp(),
        isNSFW: replyModerationResult ? (replyModerationResult.isNSFW || false) : false,
        moderationIssues: replyModerationResult ? (replyModerationResult.issues || []) : []
      });

      // Update confession reply count in the parent document
      const newReplyCount = replyCount + 1;
      const confessionRef = doc(db, 'confessions', confession.id);
      await updateDoc(confessionRef, {
        replyCount: newReplyCount
      });

      // Update local reply count immediately
      setReplyCount(newReplyCount);

      // Focus back to textarea for easier follow-up replies
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);

    } catch (err) {
      console.error("Error submitting reply:", err);
      showError("Failed to submit reply. Please try again.");
      
      // Restore form data on error
      setReplyText(submittedText);
      setReplyGifUrl(submittedGifUrl);
      
      // Clear optimistic reply on error
      setOptimisticReply(null);
    } finally {
      setSubmittingReply(false);
    }
  }

  // Combine real replies with optimistic reply for display
  const displayReplies = [...replies];
  if (optimisticReply) {
    displayReplies.push(optimisticReply);
  }

  return (
    <div className={`confession-item rank-${rank || ''}`} style={{ position: 'relative' }}>
      {/* Report Button - only show for real confessions (not optimistic) */}
      {!confession.isOptimistic && (
        <ReportButton 
          contentId={confession.id}
          contentType="confession"
          contentText={confession.text}
        />
      )}
      
      {rank && <div className="rank-badge">{getBadge()}</div>}
      
      <div className="confession-content" style={{ position: 'relative' }}>
        <p style={{
          filter: shouldBlurContent(confession.isNSFW) && !showNsfwContent ? 'blur(8px)' : 'none',
          transition: 'filter 0.3s ease'
        }}>
          {displayText}
        </p>
        
        {shouldBlurContent(confession.isNSFW) && !showNsfwContent && (
          <div className="nsfw-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            cursor: 'pointer'
          }} onClick={toggleNsfwContent}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxWidth: '300px'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>
                This content contains NSFW material.
              </p>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                You can disable the filter in{' '}
                <span 
                  style={{ 
                    color: '#3498db', 
                    textDecoration: 'underline', 
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSettings) onOpenSettings();
                  }}
                >
                  Settings
                </span>.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {shouldTruncate && (
        <button 
          className="see-more-btn"
          onClick={() => setShowFullText(!showFullText)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.25rem 0',
            marginTop: '0.25rem'
          }}
        >
          {showFullText ? 'See less' : 'See more'}
        </button>
      )}

      {confession.mediaUrl && (
        <div className="media-container" style={{ position: 'relative' }}>
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Confession media" 
              className="confession-media" 
              loading="lazy" 
              style={{
                filter: shouldBlurContent(confession.isNSFW) && !showNsfwContent ? 'blur(8px)' : 'none',
                transition: 'filter 0.3s ease'
              }}
            />
          ) : (
            <video 
              src={confession.mediaUrl} 
              controls 
              className="confession-media" 
              loading="lazy" 
              style={{
                filter: shouldBlurContent(confession.isNSFW) && !showNsfwContent ? 'blur(8px)' : 'none',
                transition: 'filter 0.3s ease'
              }}
            />
          )}
          
          {shouldBlurContent(confession.isNSFW) && !showNsfwContent && (
            <div className="nsfw-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer'
            }} onClick={toggleNsfwContent}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                maxWidth: '300px'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>
                  This content contains NSFW material.
                </p>
                <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                  You can disable the filter in{' '}
                  <span 
                    style={{ 
                      color: '#3498db', 
                      textDecoration: 'underline', 
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenSettings) onOpenSettings();
                    }}
                  >
                    Settings
                  </span>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {confession.gifUrl && !confession.mediaUrl && (
        <div className="gif-container" style={{ position: 'relative' }}>
          <img 
            src={confession.gifUrl} 
            alt="Confession GIF" 
            className="confession-gif" 
            loading="lazy" 
            style={{
              filter: shouldBlurContent(confession.isNSFW) && !showNsfwContent ? 'blur(8px)' : 'none',
              transition: 'filter 0.3s ease'
            }}
          />
          
          {shouldBlurContent(confession.isNSFW) && !showNsfwContent && (
            <div className="nsfw-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer'
            }} onClick={toggleNsfwContent}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                maxWidth: '300px'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>
                  This content contains NSFW material.
                </p>
                <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                  You can disable the filter in{' '}
                  <span 
                    style={{ 
                      color: '#3498db', 
                      textDecoration: 'underline', 
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenSettings) onOpenSettings();
                    }}
                  >
                    Settings
                  </span>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

              <ReactionBar
          selectedEmoji={selectedEmoji}
          localReactions={localReactions}
          onReactionToggle={handleReactionToggle}
        />

      <div className="reply-section">
        <button
          className="toggle-replies-btn"
          onClick={() => setShowReplies(!showReplies)}
          disabled={loading && !showReplies}
          aria-expanded={showReplies}
        >
          {showReplies ? 'Hide Replies' : `Show Replies (${replyCount})`}
        </button>

        {showReplies && (
          <div className="replies-container">
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleReplySubmit} className="reply-form">
              <div className="textarea-wrapper reply-wrapper">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={2}
                  disabled={submittingReply || moderatingReply}
                  style={{ resize: 'none' }}
                />
                <div className="reply-actions" style={{ 
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
                      disabled={submittingReply || moderatingReply}
                    >
                      <HiGif size={24} />
                    </button>
                    <button
                      type="button"
                      ref={emojiPickerRef}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="action-button emoji-action"
                      aria-label="Add emoji"
                      disabled={submittingReply || moderatingReply}
                    >
                      <MdOutlineEmojiEmotions size={24} />
                    </button>
                  </div>
                  <div className="right-actions">
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={submittingReply || moderatingReply || (!replyText.trim() && !replyGifUrl)}
                      style={{ 
                        width: 'auto',
                        minWidth: 'unset',
                        paddingLeft: '1.1em',
                        paddingRight: '1.1em',
                        whiteSpace: 'nowrap',
                        opacity: moderatingReply ? 0.7 : 1
                      }}
                    >
                      {moderatingReply ? 'Checking...' : submittingReply ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>

              {showEmojiPicker && (
                <SimpleEmojiPicker
                  onEmojiClick={(emojiData) => {
                    setReplyText(prev => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </form>

            {replyGifUrl && (
              <div className="gif-preview-container">
                <img 
                  src={replyGifUrl} 
                  alt="Reply GIF preview" 
                  className="gif-preview" 
                />
                <button 
                  type="button" 
                  onClick={() => setReplyGifUrl('')} 
                  className="remove-gif"
                  disabled={submittingReply || moderatingReply}
                >
                  Remove
                </button>
              </div>
            )}

            {showGifPicker && (
              <GifPicker
                onSelect={(url) => {
                  setReplyGifUrl(url);
                  setTimeout(() => setShowGifPicker(false), 0);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {loading && replies.length === 0 && !optimisticReply && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Loading replies...
              </div>
            )}

            {displayReplies.map((reply) => (
              <div 
                key={reply.id} 
                className={`reply-item ${reply.isOptimistic ? 'optimistic-reply' : ''}`}
                style={{ 
                  position: 'relative',
                  ...(reply.isOptimistic ? { opacity: 0.8 } : {})
                }}
              >
                {/* Report Button for Replies - only show for real replies */}
                {!reply.isOptimistic && (
                  <ReportButton 
                    contentId={reply.id}
                    contentType="reply"
                    contentText={reply.text || 'GIF reply'}
                  />
                )}
                
                {reply.text && (
                  <div className="reply-content" style={{ position: 'relative' }}>
                    <p style={{
                      filter: shouldBlurContent(reply.isNSFW) && !showNsfwReplies.has(reply.id) ? 'blur(8px)' : 'none',
                      transition: 'filter 0.3s ease'
                    }}>
                      {getReplyDisplayText(reply)}
                      {shouldTruncateReply(reply.text) && (
                        <button 
                          className="see-more-btn"
                          onClick={() => toggleReplyExpansion(reply.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3498db',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            padding: '0.25rem 0',
                            marginTop: '0.25rem'
                          }}
                        >
                          {expandedReplies.has(reply.id) ? 'See less' : 'See more'}
                        </button>
                      )}
                    </p>
                    
                    {shouldBlurContent(reply.isNSFW) && !showNsfwReplies.has(reply.id) && (
                      <div className="nsfw-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }} onClick={() => toggleNsfwReply(reply.id)}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          maxWidth: '250px'
                        }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '0.9rem' }}>
                            This reply contains NSFW material.
                          </p>
                          <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                            You can disable the filter in{' '}
                            <span 
                              style={{ 
                                color: '#3498db', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenSettings) onOpenSettings();
                              }}
                            >
                              Settings
                            </span>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {reply.gifUrl && (
                  <div className="gif-container" style={{ position: 'relative' }}>
                    <img 
                      src={reply.gifUrl} 
                      alt="Reply GIF" 
                      className="reply-gif" 
                      loading="lazy" 
                      style={{
                        filter: shouldBlurContent(reply.isNSFW) && !showNsfwReplies.has(reply.id) ? 'blur(8px)' : 'none',
                        transition: 'filter 0.3s ease'
                      }}
                    />
                    
                    {shouldBlurContent(reply.isNSFW) && !showNsfwReplies.has(reply.id) && (
                      <div className="nsfw-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }} onClick={() => toggleNsfwReply(reply.id)}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          maxWidth: '250px'
                        }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '0.9rem' }}>
                            This reply contains NSFW material.
                          </p>
                          <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                            You can disable the filter in{' '}
                            <span 
                              style={{ 
                                color: '#3498db', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenSettings) onOpenSettings();
                              }}
                            >
                              Settings
                            </span>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="reply-meta">
                  <span>
                    {reply.isOptimistic ? (
                      <span className="posting-indicator">Posting...</span>
                    ) : (
                      reply.createdAt?.toDate 
                        ? new Date(reply.createdAt.toDate()).toLocaleString() 
                        : 'Just now'
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ConfessionItem);