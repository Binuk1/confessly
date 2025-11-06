import { useState, useEffect, useRef, memo } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
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
import { FaRegCommentDots } from 'react-icons/fa';
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
    
    // Listen for custom event for immediate updates
    const handleNsfwToggle = (event) => {
      const newNsfwFilter = event.detail.nsfwFilter;
      setNsfwFilter(newNsfwFilter);
      
      // If NSFW filter is turned on and this is an NSFW confession, close the replies
      if (newNsfwFilter && confession.isNSFW) {
        setShowReplies(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nsfwToggle', handleNsfwToggle);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nsfwToggle', handleNsfwToggle);
    };
  }, [confession.isNSFW]);

  // Helper function to check if content should be blurred
  const shouldBlurContent = (isNSFW) => {
    return nsfwFilter && isNSFW;
  };
  
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Real-time reaction listener
  useEffect(() => {
    let isMounted = true;
    
    const handleReactionUpdate = (reactions) => {
      if (!isMounted) return;
      
      // Only update if reactions have actually changed
      setLocalReactions(prevReactions => {
        const current = JSON.stringify(prevReactions);
        const next = JSON.stringify(reactions);
        const changed = current !== next;
        if (changed) {
          // After updating counts, refresh the current user's reaction so UI (other views) can update
          getUserReaction(confession.id).then((userReaction) => {
            if (isMounted) setSelectedEmoji(userReaction);
          }).catch(err => {
            // Non-fatal: just log
            console.error('Error refreshing user reaction after update:', err);
          });
        }
        return changed ? reactions : prevReactions;
      });
    };
    
    const unsubscribe = subscribeToReactions(confession.id, handleReactionUpdate);

    // Get user's current reaction
    getUserReaction(confession.id).then((userReaction) => {
      if (isMounted) {
        setSelectedEmoji(userReaction);
      }
    }).catch(error => {
      console.error('Error getting user reaction:', error);
    });

    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [confession.id]);

  const TRUNCATE_LIMIT = 200;
  const TRUNCATE_LINES = 5; // maximum number of visible lines before See more

  const computeTruncation = (text, limitChars, limitLines, expanded) => {
    const lines = (text || '').split(/\r?\n/);
    const exceedsLines = lines.length > limitLines;
    const exceedsChars = (text || '').length > limitChars;
    const shouldTruncateNow = (exceedsLines || exceedsChars) && !expanded;

    if (!shouldTruncateNow) return { text, truncated: exceedsLines || exceedsChars };

    // Build by lines first
    if (exceedsLines) {
      const sliced = lines.slice(0, limitLines).join('\n');
      return { text: sliced + '...', truncated: true };
    }
    // Fallback to character truncation
    return { text: text.substring(0, limitChars) + '...', truncated: true };
  };

  const confessionDisplay = computeTruncation(confession.text, TRUNCATE_LIMIT, TRUNCATE_LINES, showFullText);
  const displayText = confessionDisplay.text;
  const shouldTruncate = confessionDisplay.truncated;

  // Helper function to check if reply should be truncated
  const TRUNCATE_REPLY_LINES = 5;
  const shouldTruncateReply = (text) => {
    if (!text) return false;
    const lines = text.split(/\r?\n/);
    return lines.length > TRUNCATE_REPLY_LINES || text.length > TRUNCATE_LIMIT;
  };
  
  // Helper function to get display text for reply
  const getReplyDisplayText = (reply) => {
    if (!reply.text) return '';
    const lines = reply.text.split(/\r?\n/);
    const exceedsLines = lines.length > TRUNCATE_REPLY_LINES;
    const exceedsChars = reply.text.length > TRUNCATE_LIMIT;
    const isExpanded = expandedReplies.has(reply.id);
    if (!(exceedsLines || exceedsChars) || isExpanded) return reply.text;
    if (exceedsLines) return lines.slice(0, TRUNCATE_REPLY_LINES).join('\n') + '...';
    return reply.text.substring(0, TRUNCATE_LIMIT) + '...';
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
      color: 'white',
      fontWeight: 'bold',
      fontSize: '1.2rem',
    };

    const badgeConfigs = {
      1: {
        component: TbCircleNumber1Filled,
        size: 24,
        gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
        border: '2px solid #FF8C00',
        color: '#8B4513'
      },
      2: {
        component: TbCircleNumber2Filled,
        size: 22,
        gradient: 'linear-gradient(135deg, #C0C0C0, #A9A9A9)',
        border: '2px solid #696969',
        color: '#2F4F4F'
      },
      3: {
        component: TbCircleNumber3Filled,
        size: 20,
        gradient: 'linear-gradient(135deg, #CD7F32, #B8860B)',
        border: '2px solid #8B6914',
        color: '#654321'
      },
      4: {
        component: TbCircleNumber4Filled,
        size: 18,
        gradient: 'linear-gradient(135deg, #87CEEB, #4682B4)',
        border: '2px solid #4169E1',
        color: '#1E3A8A'
      },
      5: {
        component: TbCircleNumber5Filled,
        size: 16,
        gradient: 'linear-gradient(135deg, #98FB98, #32CD32)',
        border: '2px solid #228B22',
        color: '#006400'
      }
    };

    const badgeConfig = badgeConfigs[rank];
    
    if (!badgeConfig) {
      // For ranks beyond 5, show a simple badge with the number
      return (
        <div style={{
          ...badgeStyle,
          background: 'linear-gradient(135deg, #E0E0E0, #B0B0B0)',
          border: '2px solid #808080',
          color: '#333',
          fontSize: '1rem'
        }}>
          {rank}
        </div>
      );
    }

    const BadgeComponent = badgeConfig.component;
    
    return (
      <div style={{
        ...badgeStyle,
        background: badgeConfig.gradient,
        border: badgeConfig.border
      }}>
        <BadgeComponent size={badgeConfig.size} color={badgeConfig.color} />
      </div>
    );
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
        collection(db, `confessions/${confession.id}/replies`)
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
          // Broadcast actual reply count to other views
          try {
            window.dispatchEvent(new CustomEvent('confessionReply', { detail: { id: confession.id, replyCount: sortedReplies.length } }));
          } catch (e) {
            // ignore
          }
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
        [emoji]: Math.max(0, (prev[emoji] || 1) - 1)  // Ensure we have at least 1 before subtracting
      }));
      // Notify other parts of the UI (e.g., Trending) to subscribe/update immediately
      try {
        window.dispatchEvent(new CustomEvent('confessionReaction', { detail: { id: confession.id } }));
      } catch (e) {
        // ignore
      }
    } else {
      // Adding new reaction
      setSelectedEmoji(emoji);
      setLocalReactions(prev => {
        const newReactions = { ...prev };
        // Remove count from previous emoji if exists
        if (previousEmoji) {
          newReactions[previousEmoji] = Math.max(0, (newReactions[previousEmoji] || 1) - 1);
        }
        // Add count to new emoji, ensuring we don't go below 0
        newReactions[emoji] = Math.max(1, (newReactions[emoji] || 0) + 1);
        return newReactions;
      });
      // Notify other parts of the UI (e.g., Trending) to subscribe/update immediately
      try {
        window.dispatchEvent(new CustomEvent('confessionReaction', { detail: { id: confession.id } }));
      } catch (e) {
        // ignore
      }
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
  
    // For replies: do optimistic write first (fast UX) then run ban/moderation in background
    // This mirrors the confession flow: post immediately, then validate asynchronously.
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
    // Optimistically bump reply count so other views see immediate change
    setReplyCount(prev => {
      const newCount = prev + 1;
      try {
        window.dispatchEvent(new CustomEvent('confessionReply', { detail: { id: confession.id, replyCount: newCount } }));
      } catch (e) {
        // ignore
      }
      return newCount;
    });
    
    // Store form data before clearing
    const submittedText = replyText.trim();
    const submittedGifUrl = replyGifUrl;
    
    // Clear form immediately for better UX
    setReplyText('');
    setReplyGifUrl('');
    setShowGifPicker(false);
    setShowEmojiPicker(false);

    try {
      // Add reply to replies collection immediately (optimistic write)
      const docData = {
        text: submittedText,
        gifUrl: submittedGifUrl || null,
        confessionId: confession.id,
        createdAt: serverTimestamp(),
        // moderation placeholders
        moderated: false,
        moderatedAt: null,
        isNSFW: false,
        moderationIssues: []
      };

      const docRef = await addDoc(collection(db, `confessions/${confession.id}/replies`), docData);

      // Fire-and-forget: log IP (non-blocking)
      (async () => {
        try {
          const logReplyIp = httpsCallable(functions, 'logReplyIp');
          await logReplyIp({ 
            confessionId: confession.id,
            replyId: docRef.id
          });
        } catch (ipError) {
          console.warn('Reply IP logging failed (non-critical):', ipError.message);
        }
      })();

      // Increment parent confession reply count right away (optimistic)
      const newReplyCount = replyCount; // current local already incremented above
      try {
        const confessionRef = doc(db, 'confessions', confession.id);
        // Update in background; don't await blocking UI
        (async () => {
          try {
            const { updateDoc: upd, doc: docFn } = await import('firebase/firestore');
            await upd(docFn(db, 'confessions', confession.id), {
              replyCount: newReplyCount
            });
          } catch (err) {
            console.error('Failed to update parent reply count:', err);
          }
        })();
      } catch (err) {
        console.error('Error scheduling parent reply count update:', err);
      }

      // Run ban check & moderation in background
      (async () => {
        try {
          const checkReplyBan = httpsCallable(functions, 'checkReplyBan');
          const banPromise = checkReplyBan().catch(err => ({ error: err }));
          const moderationPromise = replyText.trim() ? ContentModerationService.moderateContent(replyText.trim(), 'reply').catch(err => ({ error: err })) : Promise.resolve(null);

          const [banResult, moderationResult] = await Promise.all([banPromise, moderationPromise]);

          if (banResult && !banResult.error && banResult.data && banResult.data.isBanned) {
            // Delete reply doc
            try {
              await deleteDoc(docRef);
            } catch (delErr) {
              console.error('Failed to delete banned reply:', delErr);
            }
            // Remove optimistic reply
            setOptimisticReply(null);
            // Decrement local reply count
            setReplyCount(prev => Math.max(0, prev - 1));
            showError(`❌ Your IP address has been banned from posting replies. Reason: ${banResult.data.reason}. ${banResult.data.expiresAt ? `Expires: ${new Date(banResult.data.expiresAt).toLocaleString()}` : 'Permanent'}`);
            return;
          }

          // If moderation returned a valid result, update the reply doc with moderation metadata
          if (moderationResult && !moderationResult.error && moderationResult.isNSFW !== undefined) {
            try {
              const update = {
                moderated: true,
                moderatedAt: serverTimestamp(),
                isNSFW: moderationResult.isNSFW || false,
                moderationIssues: moderationResult.issues || []
              };
              const { updateDoc: upd, doc: docFn } = await import('firebase/firestore');
              await upd(docFn(db, `confessions/${confession.id}/replies`, docRef.id), update);
            } catch (updateErr) {
              console.error('Failed to update reply moderation metadata:', updateErr);
            }
          }
        } catch (bgErr) {
          console.error('Background reply ban/moderation failed:', bgErr);
        }
      })();

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
  const displayReplies = optimisticReply 
    ? [...replies, optimisticReply]
    : replies;

  // Whether the main confession body is blurred by NSFW filter
  const isConfessionBlurred = shouldBlurContent(confession.isNSFW);

  return (
    <div className="confession-container">
      <div className={`confession-item rank-${rank || ''}`} style={{ 
        position: 'relative'
      }}>
        {isConfessionBlurred && (
          <div className="nsfw-blur-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '12px',
            zIndex: 2,
            pointerEvents: 'auto'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '1rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              maxWidth: '280px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', color: '#333', fontSize: '0.95rem' }}>
                🔒 Content filtered by NSFW detection
              </p>
              <p style={{ margin: '0', fontSize: '0.85rem', color: '#333', lineHeight: '1.4' }}>
                Go to{' '}
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
                </span>
                {' '}and turn off NSFW filter to view this content.
              </p>
            </div>
          </div>
        )}
        
        <ReportButton 
          contentId={confession.id}
          contentType="confession"
          contentText={confession.text}
          disabled={isConfessionBlurred}
        />
        
        {rank && <div className="rank-badge">{getBadge()}</div>}
        
        <p
          className={isConfessionBlurred ? 'blurred-content' : ''}
          style={{ whiteSpace: 'pre-line' }}
          aria-hidden={isConfessionBlurred ? true : undefined}
          onCopy={isConfessionBlurred ? (e) => e.preventDefault() : undefined}
        >
          {displayText}
        </p>
        
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
        <div className="media-container">
          {confession.mediaType === 'image' ? (
            <img 
              src={confession.mediaUrl} 
              alt="Confession media" 
              className="confession-media" 
              loading="lazy" 
            />
          ) : (
            <video 
              src={confession.mediaUrl} 
              controls 
              className="confession-media" 
              loading="lazy" 
            />
          )}
        </div>
      )}

      {confession.gifUrl && !confession.mediaUrl && (
        <div className="gif-container">
          <img 
            src={confession.gifUrl} 
            alt="Confession GIF" 
            className="confession-gif" 
            loading="lazy" 
          />
        </div>
      )}

      {/* Actions row: compact reaction + comment toggle */}
      <div className="item-actions" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem'
      }}>
        <ReactionBar
          selectedEmoji={selectedEmoji}
          localReactions={localReactions}
          onReactionToggle={handleReactionToggle}
          compact={true}
        />
        <button
          type="button"
          className={`comment-toggle-btn ${showReplies ? 'active' : ''}`}
          onClick={() => setShowReplies(!showReplies)}
          disabled={loading && !showReplies}
          aria-expanded={showReplies}
          aria-label={showReplies ? 'Hide replies' : 'Show replies'}
        >
          <FaRegCommentDots size={18} />
          <span className="comment-count">{replyCount}</span>
        </button>
      
      </div>

      <div className="reply-section">
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
                      disabled={submittingReply || (!replyText.trim() && !replyGifUrl)}
                      style={{ 
                        width: 'auto',
                        minWidth: 'unset',
                        paddingLeft: '1.1em',
                        paddingRight: '1.1em',
                        whiteSpace: 'nowrap',
                        opacity: submittingReply ? 0.7 : 1
                      }}
                    >
                      {submittingReply ? 'Posting...' : 'Reply'}
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
                  transition: 'opacity 0.3s ease',
                  ...(reply.isOptimistic ? { opacity: 0.8 } : {})
                }}
              >
                {shouldBlurContent(reply.isNSFW) && (
                  <div className="nsfw-blur-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '8px',
                    zIndex: 2,
                    pointerEvents: 'auto'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      maxWidth: '220px',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '0.85rem' }}>
                        🔒 Reply filtered
                      </p>
                      <p style={{ margin: '0', fontSize: '0.75rem', color: '#666' }}>
                        Turn off NSFW filter in{' '}
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
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {/* Report Button for Replies - only show for real replies */}
                {!reply.isOptimistic && (
                  <ReportButton 
                    contentId={reply.id}
                    contentType="reply"
                    contentText={reply.text || 'GIF reply'}
                    confessionId={confession.id}
                    disabled={shouldBlurContent(reply.isNSFW)}
                  />
                )}
                
                {reply.text && (
                  <p
                    className={shouldBlurContent(reply.isNSFW) ? 'blurred-content' : ''}
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    aria-hidden={shouldBlurContent(reply.isNSFW) ? true : undefined}
                    onCopy={shouldBlurContent(reply.isNSFW) ? (e) => e.preventDefault() : undefined}
                  >
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
                )}
                {reply.gifUrl && (
                  <div className={`gif-container ${shouldBlurContent(reply.isNSFW) ? 'blurred-content' : ''}`}>
                    <img 
                      src={reply.gifUrl} 
                      alt="Reply GIF" 
                      className="reply-gif" 
                      loading="lazy" 
                    />
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
    </div>
  );
}

export default memo(ConfessionItem);