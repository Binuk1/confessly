import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function AdminPanel() {
  const [confessions, setConfessions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'confessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setConfessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this confession?")) {
      await deleteDoc(doc(db, 'confessions', id));
    }
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel ({confessions.length} confessions)</h2>
      <div className="confession-list">
        {confessions.map((conf) => (
          <div key={conf.id} className="confession-item">
            <p>{conf.text}</p>
            {conf.gifUrl && <img src={conf.gifUrl} alt="GIF" className="admin-media" />}
            {conf.mediaUrl && (
              conf.mediaType === 'image' ? 
                <img src={conf.mediaUrl} alt="Media" className="admin-media" /> :
                <video src={conf.mediaUrl} controls className="admin-media" />
            )}
            <button onClick={() => handleDelete(conf.id)} className="delete-btn">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPanel;