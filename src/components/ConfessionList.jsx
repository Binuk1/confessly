import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';

function ConfessionList() {
  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'confessions'),
      orderBy('createdAt', 'desc'),
      limit(page * 10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        totalReactions: Object.values(doc.data().reactions || {}).reduce((a, b) => a + b, 0)
      }));
      setConfessions(items);
      setLoading(false);
    });

    return () => unsub();
  }, [page]);

  return (
    <div className="confession-list">
      {confessions.map((conf) => (
        <ConfessionItem key={conf.id} confession={conf} />
      ))}
      <button
        onClick={() => setPage(page + 1)}
        disabled={loading}
        className="load-more-btn"
      >
        {loading ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}

export default ConfessionList;