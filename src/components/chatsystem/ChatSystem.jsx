import React, { useState, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import MediaViewer from './MediaViewer';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import './ChatSystem.css';

function ChatSystem({ currentUser, selectedFriend, setSelectedFriend }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, media: [], index: 0 });
  const messagesEndRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth);

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
    }, (err) => {
      setMessages([]);
      setLoading(false);
      console.error('Chat snapshot error:', err);
    });
    return () => unsub();
  }, [selectedFriend, currentUser && currentUser.uid]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Enhanced send handler for text + media
  const handleSend = async ({ text, media }) => {
    if ((!text.trim() && (!media || media.length === 0)) || !selectedFriend || !currentUser || !currentUser.uid) return;
    setSending(true);
    const chatId = [currentUser.uid, selectedFriend.id].sort().join('_');
    // Filter out any undefined or incomplete media objects
    const safeMedia = Array.isArray(media) ? media.filter(m => m && m.url && m.type) : [];
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: text.trim() ? text : '',
      media: safeMedia,
      from: currentUser.uid,
      to: selectedFriend.id,
      createdAt: serverTimestamp(),
      read: false
    });
    setSending(false);
  };

  // Chat panel rendering (header removed, only messages and input)
  const renderChatPanel = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%',width:'100%'}}>
      <div className="chat-messages-panel" style={{flex:1,display:'flex',flexDirection:'column',background:'#fff',padding:'0 0 0 0'}}>
        <div className="chat-messages-list" 
          style={{flex:1,overflowY:'auto',padding:'1em',display:'flex',flexDirection:'column'}}
          onTouchStart={e => { e.stopPropagation(); }}
          onTouchMove={e => { e.stopPropagation(); }}
          onWheel={e => { e.stopPropagation(); }}
        >
          {loading ? (
            <div style={{color:'#888'}}>Loading...</div>
          ) :
            messages.length === 0 ? <div className="chat-empty">No messages yet.</div> :
            messages.map((msg, msgIdx) => {
              const isMediaOnly = (!msg.text || msg.text.trim() === '') && msg.media && Array.isArray(msg.media) && msg.media.length > 0;
              return (
                <div key={msg.id}
                  className={
                    'chat-message' +
                    (msg.from === (currentUser && currentUser.uid) ? ' own' : '') +
                    (isMediaOnly ? ' chat-message-mediaonly' : '')
                  }
                  style={{
                    marginBottom: 8,
                    alignSelf: msg.from === (currentUser && currentUser.uid) ? 'flex-end' : 'flex-start',
                    background: isMediaOnly ? 'none' : undefined,
                    boxShadow: isMediaOnly ? 'none' : undefined,
                    padding: isMediaOnly ? 0 : undefined,
                    maxWidth: isMediaOnly ? 'none' : undefined,
                  }}
                >
                  {/* Text message, with wrapping */}
                  {msg.text && <span style={{wordBreak:'break-word',whiteSpace:'pre-line',overflowWrap:'anywhere'}}>{msg.text}</span>}
                  {/* Media grid (images, GIFs, videos) */}
                  {msg.media && Array.isArray(msg.media) && msg.media.length > 0 && (
                    <div className="chat-media-grid" style={{gridTemplateColumns: msg.media.length === 1 ? '1fr' : '1fr 1fr'}}>
                      {msg.media.slice(0,4).map((media, i) => (
                        <div className="chat-media-item" key={i} onClick={() => setMediaModal({ open: true, media: msg.media, index: i })}>
                          {media.type.startsWith('image') ? (
                            <ImageWithSkeleton src={media.url} alt="media" />
                          ) : media.type.startsWith('video') ? (
                            <video src={media.url} controls={false} poster={media.thumb || ''} />
                          ) : null}
                          {i === 3 && msg.media.length > 4 && (
                            <div className="chat-media-overlay">+{msg.media.length - 4}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          }
          <div ref={messagesEndRef} />
        </div>
        <ChatInput
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          disabled={sending}
          placeholder="Type a message..."
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

export default ChatSystem;
