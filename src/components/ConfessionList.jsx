import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';

function ConfessionList() {
  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // This query will use the index: confessions (createdAt DESC, __name__ ASC)
    const q = query(
      collection(db, 'confessions'),
      orderBy('createdAt', 'desc'), // Uses index - newest first
      orderBy('__name__', 'asc'),   // Explicit tiebreaker for consistent pagination
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
      setHasMore(items.length >= page * 10);
    }, (error) => {
      console.error("Error fetching confessions:", error);
      setLoading(false);
      // Handle error gracefully - could show error message to user
    });

    return () => unsub();
  }, [page]);

  return (
    <div className="confession-list">
      {confessions.length === 0 && loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <SkeletonItem size={50} />
        </div>
      ) : (
        confessions.map((conf) => (
          <ConfessionItem key={conf.id} confession={conf} />
        ))
      )}
      
      {hasMore && !loading && (
        <button
          onClick={() => setPage(page + 1)}
          disabled={loading}
          className="load-more-btn"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
      {!hasMore && confessions.length > 0 && (
        <div className="end-message">
          You've reached the end! 🎉
        </div>
      )}
    </div>
  );
}

export default ConfessionList;