import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ConfessionItem from './ConfessionItem';
import SkeletonItem from './SkeletonItem';
import { subscribeToReactionsLast24h } from '../services/reactionService';

function TrendingConfessions({ isActive = true, onOpenSettings }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const LIMIT_RECENT = 100; // cap how many docs we process client-side
  const SUBSCRIBE_LIMIT = 25; // cap how many RTDB listeners we open
  // Live maps
  const [reactionsMap, setReactionsMap] = useState({}); // { [confessionId]: total in last 24h }
  const reactionUnsubsRef = useRef({});
  const reactionsLiveRef = useRef({}); // accumulate live counts without causing reorders every tick
  const syncTimerRef = useRef(null); // throttle state sync
  // Keep previous order to make sorting stable and avoid brief rank flips
  const prevOrderRef = useRef([]);

  useEffect(() => {
    // Always keep a Firestore listener so data is warm when user switches tabs
    const q = query(
      collection(db, 'confessions'),
      orderBy('createdAt', 'desc'),
      limit(LIMIT_RECENT)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Derive a coarse Firestore reaction count if available to pre-rank candidates
        const coarseReactions = Object.values(data.reactions || {}).reduce((a, b) => a + (b || 0), 0);
        return { id: doc.id, ...data, coarseReactions };
      });

      setRecentItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trending confessions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Determine candidate IDs to subscribe to (limit to SUBSCRIBE_LIMIT)
  const candidateIds = useMemo(() => {
    if (recentItems.length === 0) return [];
    const scored = recentItems.map(item => ({
      id: item.id,
      coarseScore: item.coarseReactions || 0
    }));
    scored.sort((a, b) => b.coarseScore - a.coarseScore);
    return scored.slice(0, SUBSCRIBE_LIMIT).map(s => s.id);
  }, [recentItems]);

  // Visibility-based pause/resume for all RTDB subscriptions
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Unsubscribe all when tab not visible
        for (const id in reactionUnsubsRef.current) {
          const fn = reactionUnsubsRef.current[id];
          if (typeof fn === 'function') fn();
          delete reactionUnsubsRef.current[id];
        }
      } else {
        // Will resubscribe via next effect run based on candidateIds
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // (moved) subscription effect placed after topFive to ensure Top 5 are always subscribed

  // Hard cleanup when view becomes inactive
  useEffect(() => {
    if (!isActive) {
      // Realtime DB reaction listeners
      for (const id in reactionUnsubsRef.current) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
      }
      // Optionally reset maps to reduce memory
      setReactionsMap({});
    }
  }, [isActive]);

  const topFive = useMemo(() => {
    if (!recentItems || recentItems.length === 0) return [];
    const withScores = recentItems.map(item => {
      const reactions = reactionsMap[item.id] || 0;
      return { ...item, reactions };
    });
    // Stable sorting with previous order as final tie-breaker to avoid jitter
    const prevIndex = new Map((prevOrderRef.current || []).map((id, idx) => [id, idx]));
    const sorted = withScores.sort((a, b) => {
      // Primary: more reactions first
      if (b.reactions !== a.reactions) return b.reactions - a.reactions;
      // Secondary: previous order to keep stability (avoid flipping on ties)
      const pia = prevIndex.has(a.id) ? prevIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
      const pib = prevIndex.has(b.id) ? prevIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (pia !== pib) return pia - pib;
      // Final: more recent if both new to the list
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return sorted.slice(0, 5);
  }, [recentItems, reactionsMap]);

  useEffect(() => {
    // Debounce visual updates slightly to avoid flicker when data streams in
    if (!topFive) return;
    setIsUpdating(true);
    const t = setTimeout(() => {
      const nextIds = topFive.map(i => i.id).join('|');
      const prevIds = (prevOrderRef.current || []).join('|');
      if (nextIds !== prevIds) {
        setTrending(topFive);
        prevOrderRef.current = topFive.map(i => i.id);
      }
      // End updating shortly after DOM reorders
      setTimeout(() => setIsUpdating(false), 120);
    }, 100);
    return () => clearTimeout(t);
  }, [topFive]);

  // Subscribe to union of Top 5 and candidate IDs (within SUBSCRIBE_LIMIT)
  const subscribedIds = useMemo(() => {
    const topIds = (topFive || []).map(i => i.id);
    const set = new Set(topIds);
    for (const id of candidateIds) {
      if (set.size >= SUBSCRIBE_LIMIT) break;
      set.add(id);
    }
    return Array.from(set);
  }, [topFive, candidateIds]);

  useEffect(() => {
    if (!isActive) return;
    // Unsubscribe anything not in the target set
    const currentSet = new Set(subscribedIds);
    for (const id in reactionUnsubsRef.current) {
      if (!currentSet.has(id)) {
        const fn = reactionUnsubsRef.current[id];
        if (typeof fn === 'function') fn();
        delete reactionUnsubsRef.current[id];
      }
    }

    // Subscribe missing ones
    subscribedIds.forEach(id => {
      if (reactionUnsubsRef.current[id]) return;
      const unsub = subscribeToReactionsLast24h(id, (reactions) => {
        const total = Object.values(reactions || {}).reduce((a, b) => a + (b || 0), 0);
        // Write to ref only; state sync is interval-based to minimize reorders
        reactionsLiveRef.current = { ...reactionsLiveRef.current, [id]: total };
        // Throttle a state sync so UI updates within ~200ms
        if (!syncTimerRef.current && isActive) {
          syncTimerRef.current = setTimeout(() => {
            setReactionsMap(prev => {
              const next = reactionsLiveRef.current || {};
              const a = Object.keys(prev).sort().join('|') + JSON.stringify(prev);
              const b = Object.keys(next).sort().join('|') + JSON.stringify(next);
              if (a === b) return prev;
              return { ...next };
            });
            syncTimerRef.current = null;
          }, 200);
        }
      });
      reactionUnsubsRef.current[id] = unsub;
    });

    return () => {
      if (!isActive) {
        for (const id in reactionUnsubsRef.current) {
          const fn = reactionUnsubsRef.current[id];
          if (typeof fn === 'function') fn();
        }
        reactionUnsubsRef.current = {};
      }
    };
  }, [subscribedIds, isActive]);

  // Cleanup any pending throttle timers on unmount or when deactivating
  useEffect(() => {
    if (isActive) return;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, [isActive]);

  return (
    <div className={`trending-wrapper ${isUpdating ? 'updating' : ''}`}>
      {trending.length === 0 && loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <SkeletonItem size={50} />
        </div>
      ) : trending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No trending confessions in the last 24 hours
        </div>
      ) : (
        <>
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.9rem',
            marginBottom: '0.5rem'
          }}>
            Top 5 most reacted in the last 24 hours
          </div>
          {trending.map((conf, index) => (
            <ConfessionItem key={conf.id} confession={conf} rank={index + 1} onOpenSettings={onOpenSettings} />
          ))}
        </>
      )}
    </div>
  );
}

export default TrendingConfessions;