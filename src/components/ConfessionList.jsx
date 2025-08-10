import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';

function ConfessionList({ optimisticConfession, onOptimisticCleared }) {
  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const optimisticRef = useRef(null);

  // Auto-scroll to optimistic confession when it appears
  useEffect(() => {
    if (optimisticConfession && optimisticRef.current) {
      // Wait longer for the confession to fully render and animate
      setTimeout(() => {
        optimisticRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center', // Changed from 'start' to 'center' for better positioning
          inline: 'nearest'
        });
      }, 600); // Increased from 100ms to 600ms to allow animation to complete
    }
  }, [optimisticConfession]);

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

      // Clear optimistic confession if the real one arrived
      if (optimisticConfession && items.some(item => 
        item.text === optimisticConfession.text && 
        item.gifUrl === optimisticConfession.gifUrl
      )) {
        if (onOptimisticCleared) {
          onOptimisticCleared();
        }
      }
    }, (error) => {
      console.error("Error fetching confessions:", error);
      setLoading(false);
      // Handle error gracefully - could show error message to user
    });

    return () => unsub();
  }, [page, optimisticConfession, onOptimisticCleared]);

  // Combine optimistic confession with real confessions for display
  const displayConfessions = [];
  if (optimisticConfession) {
    displayConfessions.push(optimisticConfession);
  }
  displayConfessions.push(...confessions);

  return (
    <div className="confession-list">
      {displayConfessions.length === 0 && loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <SkeletonItem size={50} />
        </div>
      ) : (
        displayConfessions.map((conf, index) => (
          <div 
            key={conf.id} 
            ref={conf.isOptimistic ? optimisticRef : null}
            className={conf.isOptimistic ? 'optimistic-confession' : ''}
          >
            <ConfessionItem 
              confession={conf} 
              rank={null} // Remove ranks for latest feed - ranks should only be for trending/top views
            />
          </div>
        ))
      )}
      
      {hasMore && !loading && confessions.length > 0 && (
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