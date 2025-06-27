import React, { useState, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import './ChatSystem.css';

function ChatSystem({ currentUser, selectedFriend, setSelectedFriend }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
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

  const handleSend = async () => {
    if (!message.trim() || !selectedFriend || !currentUser || !currentUser.uid) return;
    setSending(true);
    const chatId = [currentUser.uid, selectedFriend.id].sort().join('_');
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: message,
      from: currentUser.uid,
      to: selectedFriend.id,
      createdAt: serverTimestamp(),
      read: false
    });
    setMessage('');
    setSending(false);
  };

  // Chat panel rendering (header removed, only messages and input)
  const renderChatPanel = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%',width:'100%'}}>
      <div className="chat-messages-panel" style={{flex:1,display:'flex',flexDirection:'column',background:'#fff',padding:'0 0 0 0'}}>
        <div className="chat-messages-list" style={{flex:1,overflowY:'auto',padding:'1em',display:'flex',flexDirection:'column'}}>
          {loading ? (
            <div style={{color:'#888'}}>Loading...</div>
          ) :
            messages.length === 0 ? <div className="chat-empty">No messages yet.</div> :
            messages.map(msg => (
              <div key={msg.id} className={`chat-message${msg.from === (currentUser && currentUser.uid) ? ' own' : ''}`} style={{marginBottom:8,alignSelf:msg.from===(currentUser && currentUser.uid)?'flex-end':'flex-start',background:msg.from===(currentUser && currentUser.uid)?'#6366f1':'#f1f5f9',color:msg.from===(currentUser && currentUser.uid)?'#fff':'#222',padding:'0.6em 1em',borderRadius:16,maxWidth:'70%',boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}}>
                <span>{msg.text}</span>
              </div>
            ))
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
    </div>
  );

  // Only render chat panel (no chat list)
  if (!selectedFriend) {
    return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'#6366f1',fontWeight:600,fontSize:'1.2em'}}>Select a chat to start messaging</span></div>;
  }

  return renderChatPanel();
}

export default ChatSystem;
