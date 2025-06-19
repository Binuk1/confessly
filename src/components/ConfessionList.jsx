import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';

function ConfessionList() {
  const [confessions, setConfessions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'confessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          totalReactions: Object.values(data.reactions || {}).reduce((a, b) => a + b, 0)
        };
      });
      setConfessions(items);
    });

    return () => unsub();
  }, []);

  return (
    <div className="confession-list">
      {confessions.map((conf) => (
        <ConfessionItem key={conf.id} confession={conf} />
      ))}
    </div>
  );
}

export default ConfessionList;