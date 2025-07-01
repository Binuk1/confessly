import React, { useState, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import MediaViewer from './MediaViewer';
import MediaPreviewGrid from './MediaPreviewGrid';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { FaPlay } from 'react-icons/fa';
import './ChatSystem.css';

function ChatSystem({ currentUser, selectedFriend, setSelectedFriend }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, media: [], index: 0 });
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [theme, setTheme] = useState(() => {
    // Prefer system theme on first load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [userMap, setUserMap] = useState({});
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  // Responsive width listener
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time chat listener
  useEffect(() => {
    if (!selectedFriend || !currentUser || !currentUser.uid) {
      setMessages([]);
      setOptimisticMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const chatId = [currentUser.uid, selectedFriend.id].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      let msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      // Clear optimistic messages that have been confirmed
      setOptimisticMessages(prev => prev.filter(optMsg => 
        !msgs.some(realMsg => realMsg.optimisticId === optMsg.optimisticId)
      ));
    }, (err) => {
      setMessages([]);
      setOptimisticMessages([]);
      setLoading(false);
      console.error('Chat snapshot error:', err);
    });
    return () => unsub();
  }, [selectedFriend, currentUser && currentUser.uid]);

  // Fetch user data for profile pictures
  useEffect(() => {
    if (!currentUser || !selectedFriend) return;
    
    const fetchUsers = async () => {
      const userIds = [currentUser.uid, selectedFriend.id];
      const q = query(collection(db, 'users'), where('__name__', 'in', userIds));
      const snap = await getDocs(q);
      const map = {};
      snap.forEach(doc => { map[doc.id] = doc.data(); });
      setUserMap(map);
    };
    
    fetchUsers();
  }, [currentUser, selectedFriend]);

  // Auto-scroll to bottom using scrollIntoView on the last message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      // Wait for scroll to complete, then set scrolledToBottom
      setTimeout(() => setScrolledToBottom(true), 100); // 100ms delay for scroll
    }
  }, [messages, optimisticMessages, selectedFriend]);

  // Show skeleton loading until scrolled to bottom and messages loaded
  useEffect(() => {
    if (scrolledToBottom) {
      setLoading(false);
    }
  }, [scrolledToBottom]);

  // When entering a new chat, reset loading and scrolledToBottom
  useEffect(() => {
    setLoading(true);
    setScrolledToBottom(false);
  }, [selectedFriend]);

  // Enhanced send handler with optimistic updates
  const handleSend = async ({ text, media }) => {
    if ((!text.trim() && (!media || media.length === 0)) || !selectedFriend || !currentUser || !currentUser.uid) return;
    
    const optimisticId = `opt_${Date.now()}_${Math.random()}`;
    const optimisticMessage = {
      optimisticId,
      id: optimisticId,
      chatId: [currentUser.uid, selectedFriend.id].sort().join('_'),
      text: text.trim() ? text : '',
      media: Array.isArray(media) ? media.filter(m => m && m.url && m.type) : [],
      from: currentUser.uid,
      to: selectedFriend.id,
      createdAt: new Date(),
      read: false,
      isOptimistic: true
    };

    // Add optimistic message immediately
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    
    setSending(true);
    try {
    const chatId = [currentUser.uid, selectedFriend.id].sort().join('_');
    const safeMedia = Array.isArray(media) ? media.filter(m => m && m.url && m.type) : [];
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: text.trim() ? text : '',
      media: safeMedia,
      from: currentUser.uid,
      to: selectedFriend.id,
      createdAt: serverTimestamp(),
        read: false,
        optimisticId // Link to optimistic message
    });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(msg => msg.optimisticId !== optimisticId));
    } finally {
    setSending(false);
    }
  };

  // Helper to format date separators
  function formatDateSeparator(date) {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Helper to get user initials
  const getUserInitials = (user, isOwn) => {
    if (isOwn) {
      return currentUser?.displayName?.[0]?.toUpperCase() || 
             currentUser?.email?.[0]?.toUpperCase() || 'U';
    } else {
      return selectedFriend?.username?.[0]?.toUpperCase() || 
             selectedFriend?.email?.[0]?.toUpperCase() || 'U';
    }
  };

  // Chat panel rendering (Messenger-style header)
  const renderChatPanel = () => (
    <div className={`chat-root chat-theme-${theme}`} style={{
      display:'flex',
      flexDirection:'column',
      height: width <= 700 ? '100dvh' : '100vh',
      width:'100%',
      overscrollBehavior: 'none',
      touchAction: 'manipulation',
      overflow: 'hidden',
      position: 'relative',
      background: '#000',
      ...(width <= 700 && {
        minHeight: '100dvh',
        maxHeight: '100dvh',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      })
    }}>
      {/* Messenger-style Header: only on mobile */}
      {width <= 700 ? (
        <div className="messenger-header" style={{
          position: 'fixed',
          top: 'env(safe-area-inset-top, 0px)',
          left: 0,
          width: '100%',
          zIndex: 10,
          background: '#18191a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 54,
          minHeight: 54,
          padding: '0 8px',
          fontSize: '1.1em',
          fontWeight: 600,
          borderBottom: '1px solid #232323',
          borderRadius: '0 0 18px 18px',
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}>
          {/* Back arrow in blue circle */}
          <button
            onClick={() => setSelectedFriend(null)}
            style={{
              background: '#0078ff',
              border: 'none',
              color: '#fff',
              fontSize: 20,
              marginRight: 10,
              cursor: 'pointer',
              padding: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,120,255,0.10)',
            }}
            aria-label="Back"
          >
            <span style={{fontWeight: 700, fontSize: 20, marginLeft: 2}}>&#8592;</span>
          </button>
          {/* Username */}
          <span style={{flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '1.1em', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {selectedFriend?.name || selectedFriend?.username || 'Chat'}
          </span>
        </div>
      ) : (
        // Desktop: just show username centered, no back button or avatar
        <div style={{
          width: '100%',
          background: '#18191a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 60,
          minHeight: 60,
          fontSize: '1.3em',
          fontWeight: 600,
          borderBottom: '1px solid #232323',
          borderRadius: '18px',
          boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}>
          <span style={{flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '1.3em', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {selectedFriend?.name || selectedFriend?.username || 'Chat'}
          </span>
        </div>
      )}
      <div className="chat-messages-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        height: width <= 700 ? 'calc(100dvh - 54px - env(safe-area-inset-top, 0px))' : '100%',
        background:'#fff',
        padding:'0',
        overscrollBehavior: 'none',
        touchAction: 'manipulation',
        overflow: 'hidden',
        ...(width <= 700 && {
          minHeight: 'calc(100dvh - 54px - env(safe-area-inset-top, 0px))',
          maxHeight: 'calc(100dvh - 54px - env(safe-area-inset-top, 0px))',
        })
      }}>
        <div
          className="chat-messages-list"
          ref={messagesListRef}
          style={{
            flex: 1,
            overflowY:'auto',
            overflowX:'hidden',
            padding:'1em',
            paddingTop: width <= 700 ? 'calc(2.5em + env(safe-area-inset-top, 0px))' : '2em',
            paddingBottom:'2em',
            display:'flex',
            flexDirection:'column',
            overscrollBehavior: 'auto',
            WebkitOverflowScrolling: 'touch',
            height: '100%',
            scrollBehavior: 'auto',
            ...(width <= 700 && {
              paddingBottom: 'calc(2em + env(safe-area-inset-bottom, 0px))',
            })
          }}
          onTouchStart={e => { e.stopPropagation(); }}
          onTouchMove={e => { e.stopPropagation(); }}
          onWheel={e => { e.stopPropagation(); }}
        >
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:16,padding:'2em 0'}}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  alignSelf: i%2===0 ? 'flex-end' : 'flex-start',
                  background: 'linear-gradient(90deg,#e0e7ef 25%,#f3f4f6 50%,#e0e7ef 75%)',
                  borderRadius: 18,
                  width: 180 + (i%2)*60,
                  height: 32,
                  marginBottom: 8,
                  animation: 'skeleton-loading 1.2s infinite',
                  opacity: 0.7
                }} />
              ))}
            </div>
          ) :
            (() => {
              const allMessages = [...messages, ...optimisticMessages].sort((a, b) => 
                new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt)
              );
              
              if (allMessages.length === 0) {
                return <div className="chat-empty">No messages yet.</div>;
              }

              let lastDate = null;
              return allMessages.map((msg, msgIdx) => {
                const isOwn = msg.from === (currentUser && currentUser.uid);
                const showDate = !lastDate || (new Date(msg.createdAt?.toDate?.() || msg.createdAt || 0)).toDateString() !== lastDate;
                const dateStr = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : new Date());
                const dateSeparator = showDate ? (
                  <div className="messenger-date-separator" key={`date-${msg.id}`}>{formatDateSeparator(dateStr)}</div>
                ) : null;
                lastDate = dateStr.toDateString();
                const isFirstInGroup = (msgIdx === 0) || allMessages[msgIdx-1].from !== msg.from;
                // Attach ref to the last message only
                const isLast = msgIdx === allMessages.length - 1;
                return (
                  <React.Fragment key={msg.id}>
                    {dateSeparator}
                    <div
                      ref={isLast ? messagesEndRef : null}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: isOwn ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        marginBottom: 10,
                        gap: 10,
                      }}
                    >
                      {/* Avatar with profile picture */}
                      <div
                        className="messenger-avatar"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {(() => {
                          const userData = isOwn ? userMap[currentUser.uid] : userMap[selectedFriend.id];
                          const photoURL = userData?.photoURL || (isOwn ? currentUser.photoURL : null);
                          
                          if (photoURL) {
                            return (
                              <img 
                                src={photoURL} 
                                alt={isOwn ? 'You' : selectedFriend.username || 'Friend'} 
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '50%'
                                }}
                                onError={(e) => {
                                  // Fallback to initial if image fails to load
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            );
                          } else {
                            return (
                              <span style={{
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%'
                              }}>
                                {getUserInitials(isOwn ? currentUser : selectedFriend, isOwn)}
                              </span>
                            );
                          }
                        })()}
                      </div>
                      {/* Message bubble */}
                      <div
                        className={`messenger-bubble ${isOwn ? 'own-message' : 'other-message'} ${msg.isOptimistic ? 'optimistic-message' : ''}`}
                        style={{
                          maxWidth: '70%',
                          padding: '8px 12px',
                          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isOwn 
                            ? 'linear-gradient(135deg, #0078ff 0%, #0056cc 100%)'
                            : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                          color: isOwn ? '#ffffff' : '#1f2937',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordWrap: 'break-word',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          position: 'relative',
                          animation: msg.isOptimistic ? 'pulse 1.5s infinite' : 'none',
                          width: 'fit-content',
                        }}
                      >
                        {msg.text && <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{msg.text}</span>}
                        {/* Media grid (images, GIFs, videos) */}
                        {msg.media && Array.isArray(msg.media) && msg.media.length > 0 && (
                          <div style={{ marginTop: msg.text ? 8 : 0 }}>
                            <MediaPreviewGrid 
                              files={msg.media.map(media => ({ url: media.url, type: media.type }))} 
                              onRemove={() => {}} // No remove function for sent messages
                              maxGrid={5}
                              readOnly={true}
                              onMediaClick={(index) => setMediaModal({ open: true, media: msg.media, index })}
                            />
                          </div>
                        )}
                        {/* Sending indicator for optimistic messages */}
                        {msg.isOptimistic && (
                          <div style={{
                            position: 'absolute',
                            top: -8,
                            right: isOwn ? -8 : 'auto',
                            left: isOwn ? 'auto' : -8,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#0078ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            color: '#fff',
                            animation: 'spin 1s linear infinite'
                          }}>
                            ↻
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()
          }
        </div>
        <ChatInput
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          disabled={sending}
          placeholder="Type here"
          style={{}}
        />
      </div>
      {mediaModal.open && (
        <MediaViewer media={mediaModal.media} startIndex={mediaModal.index} onClose={() => setMediaModal({ open: false, media: [], index: 0 })} />
      )}
    </div>
  );

  // Only render chat panel (no chat list)
  if (!selectedFriend) {
    return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'#6366f1',fontWeight:600,fontSize:'1.2em'}}>Select a chat to start messaging</span></div>;
  }

  return renderChatPanel();
}

// Skeleton loader for images
function ImageWithSkeleton({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{position:'relative',width:'100%',height:'100%'}}>
      {!loaded && (
        <div className="chat-upload-skeleton" style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(99,102,241,0.10)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',zIndex:1}}>
          <div className="skeleton-loader" style={{width:32,height:32,border:'4px solid #e0e7ff',borderTop:'4px solid #6366f1',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
        </div>
      )}
      <img src={src} alt={alt} style={{width:'100%',height:'auto',display:loaded?'block':'none',borderRadius:8}} onLoad={()=>setLoaded(true)} />
    </div>
  );
}

// Skeleton loader for videos
function VideoWithSkeleton({ src, poster }) {
  const [loaded, setLoaded] = useState(false);
  const [duration, setDuration] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      const handler = () => {
        if (videoRef.current && videoRef.current.duration) {
          const minutes = Math.floor(videoRef.current.duration / 60);
          const seconds = Math.floor(videoRef.current.duration % 60);
          setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      videoRef.current.addEventListener('loadedmetadata', handler);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handler);
        }
      };
    }
  }, []);

  return (
    <div style={{position:'relative',width:'100%',height:'100%'}}>
      {!loaded && (
        <div className="chat-upload-skeleton" style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(99,102,241,0.10)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',zIndex:1}}>
          <div className="skeleton-loader" style={{width:32,height:32,border:'4px solid #e0e7ff',borderTop:'4px solid #6366f1',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
        </div>
      )}
      <video 
        ref={videoRef}
        src={src} 
        controls={false} 
        poster={poster} 
        style={{width:'100%',height:'auto',display:loaded?'block':'none',borderRadius:8}} 
        onLoad={()=>setLoaded(true)} 
      />
      {/* Play button overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '50%',
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <FaPlay size={16} color="#ffffff" style={{marginLeft: 2}} />
      </div>
      {/* Video duration */}
      {duration && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          background: 'rgba(0,0,0,0.8)',
          color: '#ffffff',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 2,
        }}>
          {duration}
        </div>
      )}
    </div>
  );
}

export default ChatSystem;
