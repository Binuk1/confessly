import React, { useState, useEffect } from 'react';
import ChatSystem from '../components/chatsystem/ChatSystem';
import { useParams, useNavigate } from 'react-router-dom';

const FullChatPage = ({ user, friends }) => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [view, setView] = useState(friendId ? 'chat' : 'list');
  const [width, setWidth] = useState(window.innerWidth);
  const [chatAnim, setChatAnim] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (friendId && friends) {
      const found = friends.find(f => f.id === friendId);
      setSelectedFriend(found || null);
      setView('chat');
    }
  }, [friendId, friends]);

  useEffect(() => {
    if (selectedFriend) setChatAnim(true);
    else setChatAnim(false);
  }, [selectedFriend]);

  // Mobile: show either chat list or chat
  if (width < 700) {
    return (
      <div style={{width:'100vw',height:'100vh',display:'flex',flexDirection:'column',background:'linear-gradient(135deg, #6366f1 0%, #818cf8 40%, #fbbf24 100%)',overflow:'hidden',position:'relative'}}>
        <style>{`html, body { touch-action: pan-y; overscroll-behavior-y: contain; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100vw); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100vw); opacity: 0; } }
        .chat-mobile-anim { animation: slideIn 0.4s cubic-bezier(.4,0,.2,1) both; position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: #fff; z-index: 10; }
        .chatlist-mobile-anim { animation: fadeIn 0.3s; }
        .chat-mobile-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #6366f1; font-weight: 600; font-size: 1.2em; }
        `}</style>
        <div style={{flex:1,display:'flex',flexDirection:'column',height:'100dvh',position:'relative',transition:'all 0.3s',overflow:'hidden'}}>
          {view === 'list' && (
            <div className="chatlist-mobile-anim" style={{height:'100%',display:'flex',flexDirection:'column',background:'#fff',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',padding:'1.2em 1.5em 1em 1.5em',borderBottom:'1px solid #e5e7eb',background:'#fff',minHeight:70,position:'sticky',top:0,zIndex:2}}>
                <span style={{fontWeight:700,fontSize:'1.2em',color:'#6366f1'}}>Chats</span>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'1em 0.5em',height:'calc(100dvh - 130px)'}}>
                {friends.length === 0 ? (
                  <div style={{color:'#e0e7ff',marginTop:'2em',textAlign:'center'}}>No friends yet.</div>
                ) : friends.map(friend => (
                  <div key={friend.id} onClick={()=>{setSelectedFriend(friend); setView('chat'); navigate(`/chat/${friend.id}`);}} style={{padding:'0.7em 1em',borderRadius:8,marginBottom:6,cursor:'pointer',background:'#fff',color:'#6366f1',fontWeight:500,transition:'background 0.15s,color 0.15s',boxShadow:'0 1px 4px rgba(99,102,241,0.08)'}} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){setSelectedFriend(friend); setView('chat'); navigate(`/chat/${friend.id}`);}}}>
                    {friend.username || friend.email}
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/')} style={{margin:'1em',padding:'0.7em 1em',borderRadius:8,background:'none',color:'#6366f1',fontWeight:700,border:'none',cursor:'pointer',boxShadow:'none',outline:'none'}}>Back to Dashboard</button>
            </div>
          )}
          {view === 'chat' && (
            <div className="chat-mobile-anim">
              <div style={{display:'flex',alignItems:'center',padding:'1.2em 1.5em 1em 1.5em',borderBottom:'1px solid #e5e7eb',background:'#fff',minHeight:70,position:'sticky',top:0,zIndex:2}}>
                <button onClick={()=>{setView('list'); setTimeout(()=>navigate('/chat'), 400);}} style={{marginRight:16,background:'none',border:'none',color:'#6366f1',fontWeight:900,fontSize:'2em',cursor:'pointer',lineHeight:1,outline:'none',boxShadow:'none'}} aria-label="Back to chat list">&#8592;</button>
                <span style={{fontWeight:700,fontSize:'1.2em',color:'#6366f1'}}>{selectedFriend ? (selectedFriend.username || selectedFriend.email) : ''}</span>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',height:'calc(100dvh - 70px)',overflow:'hidden'}}>
                {selectedFriend ? (
                  <ChatSystem currentUser={user} friends={[]} selectedFriend={selectedFriend} setSelectedFriend={setSelectedFriend} forceFullPage={true} />
                ) : (
                  <div className="chat-mobile-empty">Select a chat to start messaging</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: multi-column Messenger layout
  useEffect(() => {
    if (selectedFriend) setChatAnim(true);
    else setChatAnim(false);
  }, [selectedFriend]);

  return (
    <div style={{width:'100vw',height:'100vh',display:'flex',background:'linear-gradient(135deg, #6366f1 0%, #818cf8 40%, #fbbf24 100%)',overflow:'hidden'}}>
      {/* Sidebar: Chat List */}
      <div style={{width:320,minWidth:220,maxWidth:350,background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',height:'100vh'}}>
        <div style={{display:'flex',alignItems:'center',padding:'1.2em 1em 1em 1em',borderBottom:'1px solid #e5e7eb',background:'#fff',minHeight:70,position:'sticky',top:0,zIndex:2}}>
          <span style={{fontWeight:700,fontSize:'1.2em',color:'#6366f1'}}>Chats</span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'1em 0.5em',height:'calc(100vh - 70px)'}}>
          {friends.length === 0 ? (
            <div style={{color:'#e0e7ff',marginTop:'2em',textAlign:'center'}}>No friends yet.</div>
          ) : friends.map(friend => (
            <div key={friend.id} onClick={()=>{setSelectedFriend(friend); navigate(`/chat/${friend.id}`);}} style={{padding:'0.7em 1em',borderRadius:8,marginBottom:6,cursor:'pointer',background:selectedFriend && selectedFriend.id===friend.id?'#eef2ff':'transparent',color:selectedFriend && selectedFriend.id===friend.id?'#6366f1':'#222',fontWeight:500,transition:'background 0.15s,color 0.15s'}} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){setSelectedFriend(friend); navigate(`/chat/${friend.id}`);}}}>
              {friend.username || friend.email}
            </div>
          ))}
        </div>
        <button onClick={()=>navigate('/')} style={{margin:'1em',padding:'0.7em 1em',borderRadius:8,background:'none',color:'#6366f1',fontWeight:700,border:'none',cursor:'pointer',boxShadow:'none',outline:'none'}}>Back to Dashboard</button>
      </div>
      {/* Center: Chat Panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',background:selectedFriend?'#fff':'linear-gradient(135deg, #6366f1 0%, #818cf8 40%, #fbbf24 100%)',minWidth:0,height:'100vh',position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',padding:'1.2em 1.5em 1em 1.5em',borderBottom:selectedFriend?'1px solid #e5e7eb':'none',background:selectedFriend?'#fff':'transparent',minHeight:70,position:'sticky',top:0,zIndex:2}}>
          <span style={{fontWeight:700,fontSize:'1.2em',color:selectedFriend?'#6366f1':'#fff',textShadow:selectedFriend?'none':'0 2px 8px rgba(0,0,0,0.18)'}}>{selectedFriend ? (selectedFriend.username || selectedFriend.email) : 'Select a chat'}</span>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',height:'calc(100vh - 70px)',overflow:'hidden',position:'relative'}}>
          {selectedFriend ? (
            <ChatSystem currentUser={user} friends={[]} selectedFriend={selectedFriend} setSelectedFriend={setSelectedFriend} forceFullPage={true} />
          ) : (
            <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:'2em',letterSpacing:'0.01em',textShadow:'0 2px 12px rgba(0,0,0,0.25)',background:'none',userSelect:'none'}}>Select a chat to start messaging</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullChatPage;
