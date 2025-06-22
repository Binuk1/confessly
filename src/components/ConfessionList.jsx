import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem'; // ADDED

function ConfessionList() {
  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
      setHasMore(items.length >= page * 10);
    });

    return () => unsub();
  }, [page]);

  return (
    <div className="confession-list">
      {/* UPDATED: Loading logic */}
      {confessions.length === 0 && loading ? (
        <>
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </>
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