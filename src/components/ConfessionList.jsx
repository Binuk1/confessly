import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';
import { subscribeToReactions } from '../services/reactionService';

function ConfessionList({ optimisticConfession, onOptimisticCleared, isActive = true, onOpenSettings }) {
  const [confessions, setConfessions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const optimisticRef = useRef(null);
  const listTopRef = useRef(null);
  const [isFading, setIsFading] = useState(false);
  const PAGE_SIZE = 10;
  const MAX_DOCS = 200; // cap for local numeric pagination

  // Auto-scroll removed to avoid jank when switching views

  useEffect(() => {
    if (!isActive) {
      return;
    }
    setLoading(true);

    const q = query(
      collection(db, 'confessions'),
      orderBy('createdAt', 'desc'),
      orderBy('__name__', 'asc'),
      limit(MAX_DOCS)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        totalReactions: Object.values(doc.data().reactions || {}).reduce((a, b) => a + b, 0)
      }));

      setConfessions(items);
      setLoading(false);

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
    });

    return () => unsub();
  }, [isActive, optimisticConfession, onOptimisticCleared]);

  const totalPages = Math.max(1, Math.ceil(confessions.length / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const pageItems = confessions.slice(startIndex, startIndex + PAGE_SIZE);

  // Combine optimistic confession on page 1 only
  const displayConfessions = [];
  if (optimisticConfession && clampedPage === 1) {
    displayConfessions.push(optimisticConfession);
  }
  displayConfessions.push(...pageItems);

  // Scroll to top when page changes
  useEffect(() => {
    if (listTopRef.current) {
      // Use smooth scroll only for programmatic page changes, not initial load
      const behavior = currentPage > 1 ? 'smooth' : 'auto';
      listTopRef.current.scrollIntoView({ 
        behavior,
        block: 'start' 
      });
    }
  }, [currentPage]);

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages || pageNum === clampedPage) return;
    
    // Start fade out
    setIsFading(true);
    
    // Change page after fade out starts
    setTimeout(() => {
      setCurrentPage(pageNum);
      // Fade back in after a short delay
      setTimeout(() => setIsFading(false), 30);
    }, 150);
  };

  return (
    <div className={`confession-list ${isFading ? 'fading' : ''}`}>
      {/* This div is used as a scroll target */}
      <div ref={listTopRef} style={{ position: 'relative', top: '-20px' }} />
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
              onOpenSettings={onOpenSettings}
            />
          </div>
        ))
      )}

      {confessions.length > 0 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => goToPage(clampedPage - 1)} disabled={clampedPage === 1 || loading}>
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`page-btn ${p === clampedPage ? 'active' : ''}`}
              onClick={() => goToPage(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
          <button className="page-btn" onClick={() => goToPage(clampedPage + 1)} disabled={clampedPage === totalPages || loading}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ConfessionList;