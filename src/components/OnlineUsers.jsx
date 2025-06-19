// src/components/OnlineUsers.jsx
import { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function OnlineUsers() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const id = crypto.randomUUID();
    const ref = doc(db, 'onlineUsers', id);
    setDoc(ref, { active: true, timestamp: serverTimestamp() });

    const cleanup = () => deleteDoc(ref);
    window.addEventListener('beforeunload', cleanup);

    const unsub = onSnapshot(collection(db, 'onlineUsers'), (snapshot) => {
      setOnlineCount(snapshot.size);
    });

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
      unsub();
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '14px',
      pointerEvents: 'none'
    }}>
      👥 {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
    </div>
  );
}

export default OnlineUsers;
